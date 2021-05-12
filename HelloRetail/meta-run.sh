#!/bin/bash
set -e
export EXP_NAMES=()
export EXP_MEMORY_SIZES=()
export EXP_DURATIONS=()
export EXP_LOADS=()
export EXP_REPETITION_COUNTS=()
export EXP_THREAT_COUNTS=()
export EXP_COUNTS=()
export EXP_REGIONS=()

for filename in measurementplans/*.json; do
    EXP_NAMES+=($(jq -r '.name' $filename))
    EXP_MEMORY_SIZES+=($(jq -r '.memSize' $filename))
    EXP_DURATIONS+=($(jq -r '.duration' $filename))
    EXP_LOADS+=($(jq -r '.load' $filename))
    EXP_REPETITION_COUNTS+=($(jq -r '.repetitions' $filename))
    EXP_THREAT_COUNTS+=($(jq -r '.loadriverthreats' $filename))
    EXP_REGIONS+=($(jq -r '.region' $filename))
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
			export EXP_MEMORY_SIZE=${EXP_MEMORY_SIZES[$index]}
			export EXP_DURATION=${EXP_DURATIONS[$index]}
			export EXP_LOAD=${EXP_LOADS[$index]}
			export EXP_THREATS=${EXP_THREAT_COUNTS[$index]}
			export EXP_REPETITION=${EXP_COUNTS[$index]}
      export EXP_REGION=${EXP_REGIONS[$index]}
			EXP_COUNTS[$index]=$(( ${EXP_COUNTS[$index]}+1 ))
			echo "---"
			echo ${EXP_NAME}
			echo ${EXP_MEMORY_SIZE}
			echo ${EXP_DURATION}
			echo ${EXP_LOAD}
			echo ${EXP_THREATS}
			echo ${EXP_REPETITION}
      echo ${EXP_REGION}
			echo "---"
			./run.sh
		fi
	done
done
