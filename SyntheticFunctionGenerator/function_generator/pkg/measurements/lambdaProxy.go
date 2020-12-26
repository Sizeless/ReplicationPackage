package measurements

import (
	"encoding/json"
	"net/http"
	"time"

	_ "net/http/pprof"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/lambda"
	"github.com/gorilla/mux"
	log "github.com/sirupsen/logrus"
)

type payload struct {
	Warmup bool `json:"warmup"`
}

var sess *session.Session

// RunServer starts the lokal lambda HTTP proxy to be able to run load tests using an HTTP load driver
func RunServer() {
	sess = session.Must(session.NewSession())
	r := mux.NewRouter()
	r.PathPrefix("/debug/pprof/").Handler(http.DefaultServeMux)
	r.HandleFunc("/warmup/{funcName}", proxyWarmupHandler)
	r.HandleFunc("/{funcName}", proxyHandler)
	srv := &http.Server{
		Handler:      r,
		Addr:         ":8000",
		WriteTimeout: 61 * time.Second,
		ReadTimeout:  61 * time.Second,
	}
	srv.SetKeepAlivesEnabled(false)
	log.Fatal(srv.ListenAndServe())
}

func proxyHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	funcName := vars["funcName"]
	lambdaClient := lambda.New(sess, aws.NewConfig().WithRegion("eu-west-1"))
	result, err := lambdaClient.Invoke(&lambda.InvokeInput{FunctionName: aws.String(funcName)})
	if err != nil {
		log.WithField("in function", "proxyHandler").WithField("function", funcName).WithField("step", "invoke").Error(err)
		w.WriteHeader(500)
		return
	}
	var response struct {
		StatusCode int    `json:"statusCode"`
		Body       string `json:"body"`
	}
	err = json.Unmarshal(result.Payload, &response)
	if err != nil {
		log.WithField("in function", "proxyHandler").WithField("function", funcName).WithField("step", "unmarshal").Error(err)
		w.WriteHeader(500)
		return
	}
	if response.StatusCode != 200 {
		log.WithField("in function", "proxyHandler").WithField("function", funcName).WithField("step", "status code").Error(response.Body)
		w.WriteHeader(500)
		return
	}
	w.WriteHeader(response.StatusCode)
	w.Write([]byte(response.Body))
}

func proxyWarmupHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	funcName := vars["funcName"]
	lambdaClient := lambda.New(sess, aws.NewConfig().WithRegion("eu-west-1"))
	warmupPayload, err := json.Marshal(payload{
		Warmup: true,
	})
	result, err := lambdaClient.Invoke(&lambda.InvokeInput{
		FunctionName: aws.String(funcName),
		Payload:      warmupPayload,
	})
	if err != nil {
		log.WithField("in function", "proxyHandler").WithField("function", funcName).WithField("step", "invoke").Error(err)
		w.WriteHeader(500)
		return
	}
	var response struct {
		StatusCode int    `json:"statusCode"`
		Body       string `json:"body"`
	}
	err = json.Unmarshal(result.Payload, &response)
	if err != nil {
		log.WithField("in function", "proxyHandler").WithField("function", funcName).WithField("step", "unmarshal").Error(err)
		w.WriteHeader(500)
		return
	}
	if response.StatusCode != 200 {
		log.WithField("in function", "proxyHandler").WithField("function", funcName).WithField("step", "status code").Error(response.Body)
		w.WriteHeader(500)
		return
	}
	w.WriteHeader(response.StatusCode)
	w.Write([]byte(response.Body))
}
