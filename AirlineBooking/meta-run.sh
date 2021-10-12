#!/bin/bash
set -e
export EXP_NAMES=()
export EXP_BRANCHES=()
export EXP_DURATIONS=()
export EXP_LOADS=()
export EXP_REPETITION_COUNTS=()
export EXP_THREAT_COUNTS=()
export EXP_COUNTS=()

for filename in measurementplans/*.json; do
    EXP_NAMES+=($(jq -r '.name' $filename))
    EXP_BRANCHES+=($(jq -r '.branch' $filename))
    EXP_DURATIONS+=($(jq -r '.duration' $filename))
    EXP_LOADS+=($(jq -r '.load' $filename))
    EXP_REPETITION_COUNTS+=($(jq -r '.repetitions' $filename))
    EXP_THREAT_COUNTS+=($(jq -r '.loadriverthreats' $filename))
    EXP_COUNTS+=( 1 )
done

max=${EXP_REPETITION_COUNTS[0]}
for n in "${EXP_REPETITION_COUNTS[@]}" ; do
    ((n > max)) && max=$n
done
echo "Maximum number of runs: $max"

for ((i=1;i<=$max;i++)); 
do 
   indexes=( $(shuf -e "${!EXP_NAMES[@]}") )
   for index in "${indexes[@]}"; do
      if [ ${EXP_COUNTS[$index]} -le ${EXP_REPETITION_COUNTS[$index]} ]
         then
		    export EXP_NAME=${EXP_NAMES[$index]}
			export EXP_BRANCH=${EXP_BRANCHES[$index]}
			export EXP_DURATION=${EXP_DURATIONS[$index]}
			export EXP_LOAD=${EXP_LOADS[$index]}
			export EXP_THREATS=${EXP_THREAT_COUNTS[$index]}
			export EXP_REPETITION=${EXP_COUNTS[$index]}
			EXP_COUNTS[$index]=$(( ${EXP_COUNTS[$index]}+1 ))
			echo "---"
			echo $EXP_NAME
			echo $EXP_BRANCH
			echo $EXP_DURATION
			echo $EXP_LOAD
			echo $EXP_THREATS
			echo $EXP_REPETITION
			echo "---"
			./run.sh
		fi
	done
done
