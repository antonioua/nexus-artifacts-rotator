# This app is designed to run inside a docker container
## To spin up the container for local development:
~~~bash
$ sudo docker run --rm -ti \
  --name node10-dev-container \
  -v $(pwd):/usr/local/src/$(basename $(pwd)) \
  -e "http_proxy=http://your_proxy_host" \
  -e "https_proxy=http://your_proxy_host" \
  -u $(id -u ${USER}):$(id -g ${USER}) \
  node:10-alpine sh
  
$ cd /usr/local/src/nexus-rotator
$ npm i
$ node script.js --nxuser="${nexus_user}" --nxpass="${nexus_pass}"
~~~

Variables nexus_user and nexus_pass are set in gtilabci as protected variables<br />
Please Note that Protected variable will be passed only to pipelines running on protected branches and tags.<br />
