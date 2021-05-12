# Execute with the following command:
# docker rm -f hello-retail ; docker build --no-cache --build-arg AWS_DEFAULT_REGION=eu-west-1 --build-arg AWS_ACCESS_KEY_ID=YOUR_PUBLIC_KEY --build-arg AWS_SECRET_ACCESS_KEY=YOUR_SECRET_KEY . -t hello-retail && docker run -d --name hello-retail hello-retail && docker exec -it hello-retail bash /hello-retail/runner.sh && docker cp hello-retail:/results .
FROM ubuntu:18.04

ARG AWS_ACCESS_KEY_ID
ARG AWS_SECRET_ACCESS_KEY
ARG AWS_DEFAULT_REGION

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

RUN aws configure set aws_access_key_id ${AWS_ACCESS_KEY_ID}
RUN aws configure set aws_secret_access_key ${AWS_SECRET_ACCESS_KEY}
RUN aws configure set region ${AWS_DEFAULT_REGION}

RUN apt-get install openjdk-8-jre-headless --yes

RUN git clone https://github.com/simontrapp/hello-retail.git
WORKDIR /hello-retail/

RUN chmod 777 /hello-retail/run.sh
RUN chmod 777 /hello-retail/meta-run.sh
RUN chmod 777 /hello-retail/runner.sh
RUN chmod 777 /hello-retail/generateConstantLoad.sh
RUN chmod 777 /hello-retail/install.sh
RUN chmod 777 /hello-retail/deploy.sh
RUN chmod 777 /hello-retail/remove.sh
RUN chmod 777 /hello-retail/build/0.env.sh
RUN chmod 777 /hello-retail/build/1.install.sh
RUN chmod 777 /hello-retail/build/2.sls.sh

RUN dos2unix /hello-retail/run.sh
RUN dos2unix /hello-retail/meta-run.sh
RUN dos2unix /hello-retail/runner.sh
RUN dos2unix /hello-retail/generateConstantLoad.sh
RUN dos2unix /hello-retail/install.sh
RUN dos2unix /hello-retail/deploy.sh
RUN dos2unix /hello-retail/remove.sh
RUN dos2unix /hello-retail/build/0.env.sh
RUN dos2unix /hello-retail/build/1.install.sh
RUN dos2unix /hello-retail/build/2.sls.sh

RUN ./install.sh ${AWS_DEFAULT_REGION} prod company team

CMD sleep 1000000000000000000000
