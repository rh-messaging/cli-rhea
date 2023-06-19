FROM centos:stream9
RUN rm /bin/sh && ln -s /bin/bash /bin/sh

#install nodejs
# https://nodejs.org/en/download/package-manager#centos-fedora-and-red-hat-enterprise-linux
RUN dnf module install -y nodejs:18/common && dnf clean all

#install lib
RUN npm install cli-rhea -g
ENV NODE_PATH /usr/lib/node_modules