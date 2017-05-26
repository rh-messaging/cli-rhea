FROM centos:7
RUN rm /bin/sh && ln -s /bin/bash /bin/sh
RUN yum -y update

#install nodejs
RUN curl --silent --location https://rpm.nodesource.com/setup_6.x | bash -
RUN yum -y install nodejs

#install lib
RUN npm install rhea-nodejs-client -g
ENV NODE_PATH /usr/lib/node_modules