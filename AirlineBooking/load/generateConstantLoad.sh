intensity=$1
durationInSeconds=$2
rm -f load.csv
for ((n=1;n<=durationInSeconds;n++))
do
	timestamp=$((n - 1)).5
	printf "$timestamp,$intensity\n" >> load.csv
done