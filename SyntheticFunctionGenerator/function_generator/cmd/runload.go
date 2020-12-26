package cmd

import (
	"encoding/csv"
	"fmt"
	"io/ioutil"
	"os"
	"os/exec"
	"path/filepath"
	"sync"
	"synthetic-function-generator/pkg/measurements"
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/dynamodb"
	log "github.com/sirupsen/logrus"
	vegeta "github.com/tsenart/vegeta/v12/lib"

	"github.com/spf13/cobra"
)

var (
	// runloadCmd represents the runload command
	runloadCmd = &cobra.Command{
		Use:   "runload [flags]",
		Short: "Start load run for measurement data",
		Long: `This command drives load on the generated functions on lambda.
It writes the results on the local filesystem specified by the flag --result-dir for later evaluation.`,
		Run: runLoad,
	}
	functionDir     string
	resultDir       string
	totalRequests   int
	requestsPerSec  int
	duration        int
	numberOfWorkers int
)

func init() {
	rootCmd.AddCommand(runloadCmd)
	runloadCmd.Flags().StringVarP(&functionDir, "func-dir", "f", "", "Directory containing the lambda functions (required)")
	runloadCmd.Flags().StringVarP(&resultDir, "result-dir", "r", "./result-data", "Directory for the measurement results")
	runloadCmd.Flags().IntVarP(&requestsPerSec, "req-per-sec", "p", 50, "Target requests per second")
	runloadCmd.Flags().IntVarP(&duration, "duration", "d", 10, "Target duration in seconds")
	runloadCmd.Flags().IntVarP(&numberOfWorkers, "workers", "w", 5, "Number of parallel workers")
	runloadCmd.MarkFlagRequired("func-dir")
}

func runLoad(cmd *cobra.Command, args []string) {
	go measurements.RunServer()
	funcDirs, err := ioutil.ReadDir(functionDir)
	if err != nil {
		log.Fatal("Invalid lambda function directory")
	}
	os.MkdirAll(resultDir, 0777)
	// Read continue file and filter funcDirs

	wgReceivers := sync.WaitGroup{}
	wgReceivers.Add(numberOfWorkers)

	funcDirChan := make(chan os.FileInfo)

	go func() {
		for _, funcDir := range funcDirs {
			funcDirChan <- funcDir
		}
		close(funcDirChan)
	}()

	for i := 0; i < numberOfWorkers; i++ {
		go func() {
			defer wgReceivers.Done()
			for funcDir := range funcDirChan {
				runSetup(funcDir.Name())
				warmup(funcDir.Name())
				startGenerator(funcDir.Name())
				fetchResultData(funcDir.Name())
				runTeardown(funcDir.Name())
			}
		}()
	}
	wgReceivers.Wait()
}

func runSetup(funcName string) {
	log.WithField("in_function", "runSetup").WithField("function", funcName).Info("Start Setup")
	command := exec.Command("node", filepath.Join(functionDir, funcName, "setup.js"))
	writer := log.WithField("in_function", "runSetup").WithField("function", funcName).Writer()
	defer writer.Close()
	command.Stderr = writer
	command.Stdout = writer
	command.Run()
	log.WithField("in_function", "runSetup").WithField("function", funcName).Info("Finished Setup")
}

func runTeardown(funcName string) {
	log.WithField("in_function", "runTeardown").WithField("function", funcName).Info("Start teardown")
	command := exec.Command("node", filepath.Join(functionDir, funcName, "teardown.js"))
	writer := log.WithField("in_function", "runTeardown").WithField("function", funcName).Writer()
	defer writer.Close()
	command.Stderr = writer
	command.Stdout = writer
	command.Run()
	log.WithField("in_function", "runTeardown").WithField("function", funcName).Info("Finished teardown")
}

func warmup(funcName string) {
	log.WithField("in_function", "warmup").WithField("function", funcName).Info("Start warmup")
	endpoint := fmt.Sprintf("http://localhost:8000/warmup/%s", funcName)
	rate := vegeta.Rate{Freq: 20, Per: time.Second}
	requests := 0
	targeter := vegeta.NewStaticTargeter(vegeta.Target{
		Method: "GET",
		URL:    endpoint,
	})
	attacker := vegeta.NewAttacker(vegeta.Timeout(time.Minute*5), vegeta.MaxWorkers(200))

	for range attacker.Attack(targeter, rate, 10*time.Second, funcName) {
		requests = requests + 1
		if requests%100 == 0 {
			log.WithField("in_function", "warmup").WithField("function", funcName).Infof("%d requests done", requests)
		}
	}
	log.WithField("in_function", "warmup").WithField("function", funcName).Info("Finished warmup")
}

func startGenerator(funcName string) {
	endpoint := fmt.Sprintf("http://localhost:8000/%s", funcName)
	rate := vegeta.Rate{Freq: requestsPerSec, Per: time.Second}
	requests := 0
	targeter := vegeta.NewStaticTargeter(vegeta.Target{
		Method: "GET",
		URL:    endpoint,
	})
	attacker := vegeta.NewAttacker(vegeta.Timeout(time.Minute*5), vegeta.MaxWorkers(1000/uint64(numberOfWorkers)))
	log.WithField("in_function", "startGenerator").WithField("function", funcName).Infof("Starting load on endpoint %s", endpoint)
	log.WithField("in_function", "startGenerator").WithField("function", funcName).Infof("Request rate: %d", requestsPerSec)
	log.WithField("in_function", "startGenerator").WithField("function", funcName).Infof("Total requests: %d", duration*requestsPerSec)
	log.WithField("in_function", "startGenerator").WithField("function", funcName).Infof("Target duration: %d seconds", duration)

	var metrics vegeta.Metrics
	for res := range attacker.Attack(targeter, rate, time.Duration(duration)*time.Second, funcName) {
		requests = requests + 1
		if requests%100 == 0 {
			log.WithField("in_function", "startGenerator").WithField("function", funcName).Infof("%d requests done", requests)
		}
		metrics.Add(res)
	}
	metrics.Close()
	file, err := os.OpenFile(filepath.Join(resultDir, fmt.Sprintf("%s_results.json", funcName)), os.O_RDWR|os.O_CREATE|os.O_TRUNC, 0666)
	if err != nil {
		log.Panic("Could not open results file")
	}
	defer file.Close()
	vegeta.NewJSONReporter(&metrics)(file)
	log.WithField("in_function", "startGenerator").WithField("function", funcName).Infof("Finished load run with %d requests", requests)
}

func fetchResultData(funcName string) {
	log.WithField("in_function", "fetchResultData").WithField("function", funcName).Info("Start fetching result data")
	file, err := os.OpenFile(filepath.Join(resultDir, fmt.Sprintf("%s.csv", funcName)), os.O_RDWR|os.O_CREATE|os.O_TRUNC, 0666)
	if err != nil {
		log.Fatal("Cannot create data file", err)
	}
	defer file.Close()
	writer := csv.NewWriter(file)
	defer writer.Flush()
	writer.Write([]string{
		"duration",
		"maxRss",
		"fsRead",
		"fsWrite",
		"vContextSwitches",
		"ivContextSwitches",
		"userDiff",
		"sysDiff",
		"rss",
		"heapTotal",
		"heapUsed",
		"external",
		"elMin",
		"elMax",
		"elMean",
		"elStd",
		"bytecodeMetadataSize",
		"heapPhysical",
		"heapAvailable",
		"heapLimit",
		"mallocMem",
		"netByRx",
		"netPkgRx",
		"netByTx",
		"netPkgTx",
	})
	sess := session.Must(session.NewSession())
	dynamoClient := dynamodb.New(sess, aws.NewConfig().WithRegion("eu-west-1"))
	dynamoClient.ScanPages(&dynamodb.ScanInput{
		TableName: &funcName,
	}, func(result *dynamodb.ScanOutput, lastPage bool) bool {
		for _, response := range result.Items {
			writer.Write([]string{
				*response["duration"].N,
				*response["maxRss"].N,
				*response["fsRead"].N,
				*response["fsWrite"].N,
				*response["vContextSwitches"].N,
				*response["ivContextSwitches"].N,
				*response["userDiff"].N,
				*response["sysDiff"].N,
				*response["rss"].N,
				*response["heapTotal"].N,
				*response["heapUsed"].N,
				*response["external"].N,
				*response["elMin"].N,
				*response["elMax"].N,
				*response["elMean"].N,
				*response["elStd"].N,
				*response["bytecodeMetadataSize"].N,
				*response["heapPhysical"].N,
				*response["heapAvailable"].N,
				*response["heapLimit"].N,
				*response["mallocMem"].N,
				*response["netByRx"].N,
				*response["netPkgRx"].N,
				*response["netByTx"].N,
				*response["netPkgTx"].N,
			})
		}
		writer.Flush()
		return !lastPage
	})
	log.WithField("in_function", "fetchResultData").WithField("function", funcName).Info("Finished fetching result data")
}
