# docker build -t registry.cri.epita.fr/prepa/students/syllabus . --no-cache
# docker push registry.cri.epita.fr/prepa/students/syllabus
FROM alpine:latest

RUN sed -i '13i append_path "/user/local/sbin"' /etc/profile
RUN sed -i '14i append_path "/opt/java/current/bin"' /etc/profile
RUN sed -i '13i export LD_LIBRARY_PATH=/opt/java/current/lib/amd64:/opt/java/current/lib/amd64/server:/opt/java/current/lib/amd64/default' /etc/profile

RUN apk update
RUN apk add --update graphviz python3 wget py3-pip gcompat perl openssh openssh-client git --no-cache

RUN pip3 install virtualenv
RUN pip3 install pyyaml
RUN pip3 install jsonschema
RUN pip3 install dominate
RUN pip3 install mistune

RUN mkdir -p /opt/java
WORKDIR /opt/java
RUN wget https://javadl.oracle.com/webapps/download/AutoDL?BundleId=248763_8c876547113c4e4aab3c868e9e0ec572 --output-document=java.re.tar.gz --quiet
RUN tar -zxf java.re.tar.gz
RUN rm java.re.tar.gz
RUN mv jre* current
RUN source /etc/profile
ENV JAVA_HOME /opt/java/current/
ENV PATH $PATH:/opt/java/current/bin
ENV LD_LIBRARY_PATH /opt/java/current/lib/amd64:/opt/java/current/lib/amd64/server:/opt/java/current/lib/amd64/default
RUN find / -name 'libjvm.so'
RUN echo $LD_LIBRARY_PATH
RUN which java
RUN java -version
