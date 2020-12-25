# Execute with the following command:
# docker rm -f eventprocessing ; docker build --build-arg AWS_ACCESS_KEY_ID=YOUR_PUBLIC_KEY --build-arg AWS_SECRET_ACCESS_KEY=YOUR_SECRET_KEY . -t eventprocessing && docker run -d --name eventprocessing eventprocessing && docker exec -it eventprocessing bash /ReplicationPackage/EventProcessing/runner.sh
FROM ubuntu:18.04

ARG AWS_ACCESS_KEY_ID
ARG AWS_SECRET_ACCESS_KEY

RUN apt-get update --yes
RUN apt-get install git --yes
RUN apt-get install dos2unix --yes
RUN apt-get install jq --yes

RUN apt-get install curl dirmngr apt-transport-https lsb-release ca-certificates --yes
RUN curl -sL https://deb.nodesource.com/setup_12.x | bash -
RUN apt-get install nodejs --yes
RUN apt-get install gcc g++ make --yes

RUN apt-get install python3-pip --yes

RUN pip3 install awscli --ignore-installed six

RUN aws configure set aws_access_key_id ${AWS_ACCESS_KEY_ID} --profile produser
RUN aws configure set aws_secret_access_key ${AWS_SECRET_ACCESS_KEY} --profile produser
RUN aws configure set region eu-west-1 --profile produser
RUN aws configure set aws_access_key_id ${AWS_ACCESS_KEY_ID}
RUN aws configure set aws_secret_access_key ${AWS_SECRET_ACCESS_KEY}
RUN aws configure set region eu-west-1

RUN npm install -g serverless
RUN npm install serverless-pseudo-parameters
RUN serverless config credentials --provider aws --key $AWS_ACCESS_KEY_ID --secret $AWS_SECRET_ACCESS_KEY --profile default

RUN apt-get install openjdk-8-jre-headless --yes

RUN git config --global user.name "Your Name"
RUN git config --global user.email "you@example.com"
RUN git clone --branch main https://github.com/Sizeless/ReplicationPackage.git
WORKDIR /ReplicationPackage/EventProcessing/

RUN chmod 777 /ReplicationPackage/EventProcessing/run.sh
RUN chmod 777 /ReplicationPackage/EventProcessing/meta-run.sh
RUN chmod 777 /ReplicationPackage/EventProcessing/generateConstantLoad.sh
RUN dos2unix /ReplicationPackage/EventProcessing/run.sh
RUN dos2unix /ReplicationPackage/EventProcessing/meta-run.sh
RUN dos2unix /ReplicationPackage/EventProcessing/runner.sh
RUN dos2unix /ReplicationPackage/EventProcessing/generateConstantLoad.sh

RUN git config --global core.editor "cat"
RUN git add *
RUN git commit -m "don't delete this"

CMD sleep 1000000000000000000000
