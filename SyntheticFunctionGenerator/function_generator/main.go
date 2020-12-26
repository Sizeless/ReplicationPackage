package main

import (
	"synthetic-function-generator/cmd"

	"github.com/markbates/pkger"
)

func main() {
	pkger.Include("/templates")
	cmd.Execute()
}
