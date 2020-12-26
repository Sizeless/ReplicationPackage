package cmd

import (
	"bufio"
	"bytes"
	"fmt"
	"io/ioutil"

	log "github.com/sirupsen/logrus"

	"math/rand"
	"os"
	"path"
	"path/filepath"
	"strings"
	"text/template"
	"time"

	"synthetic-function-generator/util"

	"github.com/goombaio/namegenerator"
	"github.com/markbates/pkger"
	"github.com/spf13/cobra"
	"gopkg.in/yaml.v2"
)

// generateCmd represents the generate command
var generateCmd = &cobra.Command{
	Use:   "generate",
	Short: "Used to create serverless function packages",
	Long: `This command generates AWS Lambda deployable serverless function artifacts.
The generated artifacts are compatible for use with the runload command.`,
	Run: runGenerate,
}

var (
	allSizes               = []int{128, 416, 704, 992, 1280, 1568, 1856, 2144, 2432, 2720, 3008}
	functionSegmentsFolder string
	maxRolledSegments      int
	numOfFuncs             int
	nameGen                namegenerator.Generator
	excludeFile            string
	replayFile             string
	sizes                  *[]int
	shouldSave             bool
	dependencyLayerArn     string
	lambdaRoleArn          string
)

func init() {
	rootCmd.AddCommand(generateCmd)
	generateCmd.Flags().StringVarP(&functionSegmentsFolder, "func-segments", "f", "", "Path to function segments to be used for generation (required)")
	generateCmd.Flags().StringVarP(&dependencyLayerArn, "dependency-layern-arn", "d", "", "The ARN of the dependency layer, see README (required)")
	generateCmd.Flags().StringVarP(&lambdaRoleArn, "lambda-role-arn", "l", "", "The ARN of the lambda role, see README (required)")
	generateCmd.Flags().IntVarP(&maxRolledSegments, "max-roll", "m", 3, "Maximum number of rolled function segments (ignored if replayFile is provided)")
	generateCmd.Flags().IntVarP(&numOfFuncs, "num-funcs", "n", 1, "Number of functions to generate (ignored if replayFile is provided)")
	generateCmd.Flags().StringVar(&excludeFile, "exclude", "", "Path to file containing roll strings to be excluded from generation (use --save flag for an example)")
	generateCmd.Flags().StringVar(&replayFile, "replay", "", "Path to file containing roll strings to be regenerated (use --save flag for an example)")
	generateCmd.Flags().BoolVar(&shouldSave, "save", false, "Whether the generated function combinations should be saved")
	sizes = generateCmd.Flags().IntSliceP("sizes", "s", allSizes, "Specify function sizes to be generated, need to be supported by the platform!")
	generateCmd.MarkFlagRequired("func-segments")
	generateCmd.MarkFlagRequired("dependency-layern-arn")
	generateCmd.MarkFlagRequired("lambda-role-arn")
}

// segmentConfig contains configuration specific to a function segment
type segmentConfig struct {
	Variables      []string          `yaml:"variables"`
	FilesToInclude []string          `yaml:"files"`
	Packages       map[string]string `yaml:"packages"`
}

// subgeneratorData contains data for the first step generation of function segment parts
type subgeneratorData []map[string]string
type includedFilesData map[string]string

// generatorData contains multiple Setup, Teardown and Function elements and variables used for the second step generation
type generatorData struct {
	FunctionName string
	FunctionSize int
	Setups       []setup
	Teardowns    []teardown
	Functions    []function
	Packages     []string
	RoleArn      string
	DepLayerArn  string
}

// setup represents one encapsulated abstraction of a setup block
type setup struct {
	Code string
}

// teardown represents one encapsulated abstraction of a teardown block
type teardown struct {
	Code string
}

// function represents one encapsulated abstraction of a function block
type function struct {
	Code string
}

func populatePreviousRollsMap() map[string]struct{} {
	previousRolls := make(map[string]struct{})
	file, err := os.Open(excludeFile)
	if err != nil {
		log.WithField("in_function", "populatePreviousRollsMap").Fatal(err)
	}
	defer file.Close()
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		previousRolls[scanner.Text()] = struct{}{}
	}
	if err := scanner.Err(); err != nil {
		log.WithField("in_function", "populatePreviousRollsMap").Fatal(err)
	}
	return previousRolls
}

func readRollsFromReplayFile() [][]string {
	var result [][]string
	file, err := os.Open(replayFile)
	if err != nil {
		log.WithField("in_function", "readRollsFromReplayFile").Fatal(err)
	}
	defer file.Close()
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		result = append(result, strings.Split(scanner.Text(), ","))
	}
	if err := scanner.Err(); err != nil {
		log.WithField("in_function", "readRollsFromReplayFile").Fatal(err)
	}
	return result
}

func savePreviousRolls(previousRolls map[string]struct{}) {
	file, err := os.OpenFile("generatedFunctions.txt", os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0644)
	if err != nil {
		log.WithField("in_function", "savePreviousRolls").Fatalf("Error creating file %s", err)
	}
	datawriter := bufio.NewWriter(file)
	for k := range previousRolls {
		_, _ = datawriter.WriteString(k + "\n")
	}
	datawriter.Flush()
	file.Close()
}

func runGenerate(cmd *cobra.Command, args []string) {
	nameGen = namegenerator.NewNameGenerator(time.Now().UnixNano())
	rand.Seed(time.Now().UnixNano())
	functionSegments := readFunctionSegments()
	previousRolls := make(map[string]struct{})
	if excludeFile != "" {
		previousRolls = populatePreviousRollsMap()
	}
	var allRolls [][]string
	if replayFile != "" {
		allRolls = readRollsFromReplayFile()
	} else {
		for i := 0; i < numOfFuncs; i++ {
			for {
				tryRolled := roll(functionSegments)
				rollString := strings.Join(tryRolled, ",")
				if _, ok := previousRolls[rollString]; !ok {
					previousRolls[rollString] = struct{}{}
					allRolls = append(allRolls, tryRolled)
					break
				}
			}
		}
	}

	for _, rolled := range allRolls {
		functionNamePrefix := strings.ToLower(strings.Join(rolled, "-"))

		for _, functionSize := range *sizes {
			generatedVariables, packages, filesToInclude, funcName, funcSize := generateVariables(rolled, functionSize, functionNamePrefix)

			os.MkdirAll(fmt.Sprintf("./build/%s/", funcName), 0777)

			setups := generateSetup(rolled, generatedVariables)
			functions := generateFunction(rolled, generatedVariables)
			teardowns := generateTeardown(rolled, generatedVariables)

			copyFilesToInclude(filesToInclude, funcName)
			generate(generatorData{
				FunctionName: funcName,
				FunctionSize: funcSize,
				Setups:       setups,
				Functions:    functions,
				Teardowns:    teardowns,
				Packages:     packages,
				RoleArn:      lambdaRoleArn,
				DepLayerArn:  dependencyLayerArn,
			})
		}
	}
	if shouldSave {
		savePreviousRolls(previousRolls)
	}
}

func readFunctionSegments() []string {
	var functionSegments []string
	files, err := ioutil.ReadDir(functionSegmentsFolder)
	if err != nil {
		log.Fatal("Could not read specified directory!")
	}
	for _, file := range files {
		if file.IsDir() {
			functionSegments = append(functionSegments, file.Name())
		}
	}
	return functionSegments
}

func roll(functionSegments []string) []string {
	var result []string
	totalSegments := len(functionSegments)
	numOfSegments := rand.Intn(maxRolledSegments) + 1
	for i := 0; i < numOfSegments; i++ {
		chosenFunc := rand.Intn(totalSegments)
		result = append(result, functionSegments[chosenFunc])
	}
	return result
}

func generateVariables(functionSegments []string, functionSize int, functionNamePrefix string) (subgeneratorData, []string, includedFilesData, string, int) {
	var result subgeneratorData
	functionName := fmt.Sprintf("%s-%d", functionNamePrefix, functionSize)
	packageMap := make(map[string]string)
	var packages []string
	setOfFiles := make(includedFilesData)
	for i := 0; i < len(functionSegments); i++ {
		config := readSegmentConfig(path.Join(functionSegmentsFolder, functionSegments[i], "variables.yaml"))
		varMap := make(map[string]string)
		for _, variable := range config.Variables {
			varMap[variable] = nameGen.Generate()
		}
		varMap["FunctionName"] = functionName
		varMap["FunctionSize"] = string(functionSize)
		result = append(result, varMap)
		for _, file := range config.FilesToInclude {
			if _, ok := setOfFiles[file]; !ok {
				setOfFiles[file] = functionSegments[i]
			}
		}
		for p, version := range config.Packages {
			packageMap[p] = version
		}
	}
	for p, version := range packageMap {
		packages = append(packages, fmt.Sprintf("\"%s\": \"%s\"", p, version))
	}
	return result, packages, setOfFiles, functionName, functionSize
}

func generateSetup(functionSegments []string, subgenData subgeneratorData) []setup {
	var templates []setup
	for i := 0; i < len(functionSegments); i++ {
		setupTmpl, err := template.New("setupCode").Parse(
			readContentBetween(path.Join(functionSegmentsFolder, functionSegments[i], "setup.js"), "START SETUP", "END SETUP"))
		if err != nil {
			log.Fatal("Error parsing setup template")
		}
		var setupCode bytes.Buffer
		if err := setupTmpl.Execute(&setupCode, subgenData[i]); err != nil {
			log.Fatal("Error executing setup template")
		}
		templates = append(templates,
			setup{
				Code: setupCode.String(),
			})
	}
	return templates
}

func generateFunction(functionSegments []string, subgenData subgeneratorData) []function {
	var templates []function
	for i := 0; i < len(functionSegments); i++ {
		functionTmpl, err := template.New("functionCode").Parse(
			readContentBetween(path.Join(functionSegmentsFolder, functionSegments[i], "function.js"), "START FUNCTION", "END FUNCTION"))
		if err != nil {
			log.Fatal("Error parsing function template")
		}
		var functionCode bytes.Buffer
		if err := functionTmpl.Execute(&functionCode, subgenData[i]); err != nil {
			log.Fatal("Error executing function template")
		}
		templates = append(templates,
			function{
				Code: functionCode.String(),
			})
	}
	return templates
}

func generateTeardown(functionSegments []string, subgenData subgeneratorData) []teardown {
	var templates []teardown
	for i := 0; i < len(functionSegments); i++ {
		teardownTmpl, err := template.New("teardownCode").Parse(
			readContentBetween(path.Join(functionSegmentsFolder, functionSegments[i], "teardown.js"), "START TEARDOWN", "END TEARDOWN"))
		if err != nil {
			log.Fatal("Error parsing teardown template")
		}
		var teardownCode bytes.Buffer
		if err := teardownTmpl.Execute(&teardownCode, subgenData[i]); err != nil {
			log.Fatal("Error executing teardown template")
		}
		templates = append(templates,
			teardown{
				Code: teardownCode.String(),
			})
	}
	return templates
}

func copyFilesToInclude(filesToInclude includedFilesData, funcName string) {
	for file, funcSegment := range filesToInclude {
		err := util.CopyFile(
			filepath.Join(functionSegmentsFolder, funcSegment, file),
			filepath.Join("build", funcName, file))
		if err != nil {
			log.Fatal("Could not copy files to include in deployment package", err)
		}
	}
}

func executeTemplate(templateFileName string, variables generatorData) {
	sourceFile, err := pkger.Open(fmt.Sprintf("/templates/%s.tmpl", templateFileName))
	if err != nil {
		log.Fatalf("Couldn't read %s template file", templateFileName)
	}
	defer sourceFile.Close()
	content, err := ioutil.ReadAll(sourceFile)
	if err != nil {
		log.Fatalf("Couldn't read %s template file contents", templateFileName)
	}
	tmpl, err := template.New(templateFileName).Parse(string(content))
	if err != nil {
		log.Fatalf("Could not parse %s template", templateFileName)
	}
	targetFile, err := os.Create(fmt.Sprintf("./build/%s/%s", variables.FunctionName, templateFileName))
	defer targetFile.Close()
	tmpl.Execute(targetFile, variables)
}

func generate(variables generatorData) {
	executeTemplate("setup.js", variables)
	executeTemplate("teardown.js", variables)
	executeTemplate("function.js", variables)
	executeTemplate("template.yaml", variables)
	executeTemplate("package.json", variables)
	executeTemplate("samconfig.toml", variables)
}

func readContentBetween(filePath string, startToken string, endToken string) string {
	var result []string
	capture := false
	file, err := os.Open(filePath)
	if err != nil {
		log.Fatal("Couldn't read file")
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		if strings.Contains(scanner.Text(), startToken) || strings.Contains(scanner.Text(), endToken) {
			capture = !capture
		}
		if capture {
			result = append(result, scanner.Text())
		}
	}
	if len(result) == 0 {
		return ""
	}
	return strings.Join(result[1:], "\n")
}

func readSegmentConfig(filePath string) segmentConfig {
	file, err := os.Open(filePath)
	defer file.Close()
	if err != nil {
		log.Fatalf("Couldn't read segment configuration file: %s", filePath)
	}
	data, err := ioutil.ReadAll(file)
	if err != nil {
		log.Fatalf("Couldn't read contents of segment configuration file: %s", filePath)
	}
	var result segmentConfig
	err = yaml.Unmarshal(data, &result)
	if err != nil {
		log.Fatal("Invalid format. Expected yaml")
	}
	return result
}
