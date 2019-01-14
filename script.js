const request = require('request');
const jsdom = require('jsdom');
const {JSDOM} = jsdom;
const moment = require('moment');
const yargs = require('yargs');
const args = yargs.argv;


var nexusBaseBrowseUrl = 'http://nexus_host/service/rest/repository/browse';
var nexusBaseActionUrl = 'http://nexus_host/repository';
var repoNameList = ['repo1', 'repo2', 'repo3'];
var sqlProjectsToExclude = ['prj1', 'prj2', 'prj3'];


var options = {
    //url: '',
    method: '',
    auth: {
        user: '',
        pass: ''
    },
    headers: {
        //'Accept': 'application/json',
        'Accept-Charset': 'utf-8',
        'User-Agent': 'my-own-client'
    },
    timeout: 30000 //30 sec
};


function makeRequest(url, options) {
    return new Promise(function (resolve, reject) {
        request(url, options, function (error, response, body) {
            if (!error && (response.statusCode == 200 || response.statusCode == 204)) {
                resolve(body);
                //resolve('Success');
            } else {
                reject(error);
            }
        });
    });
}


async function rotateArts(nexus_username, nexus_pass) {
    //set nexus credentials
    options.auth.user = nexus_username;
    options.auth.pass = nexus_pass;
    for (let item = 0; item < repoNameList.length; item++) {
        repoName = repoNameList[item];
        console.log('\n\nRotating repo', repoName, '...');

        let arrayOfProjects = [];
        //get all projects
        try {
            let url = `${nexusBaseBrowseUrl}/${repoName}`;
            options.method = 'GET';
            const resp = await makeRequest(url, options);
            const dom = new JSDOM(resp);
            let projectsNodeList = dom.window.document.querySelectorAll('table tr');

            let project;
            for (let i = 1; i < projectsNodeList.length; i++) {
                project = projectsNodeList[i].children[0].children[0].innerHTML;
                arrayOfProjects.push(project);
            }
        } catch (e) {
            console.log(e);
        }
        console.log('arrayOfProjects=', arrayOfProjects);

        //create array of objects {artifactName: N, uploadDate: X}
        //loop through projects
        for (let i = 0; i < arrayOfProjects.length; i++) {
            let url = `${nexusBaseBrowseUrl}/${repoName}/${arrayOfProjects[i]}`;
            console.log(`\n\nRotating project: ${arrayOfProjects[i]}...`);
            try {
                options.method = 'GET';
                const resp = await makeRequest(url, options);
                const dom = new JSDOM(resp);
                let artifactsNodeList = dom.window.document.querySelectorAll('table tr');
                //console.log(artifactsNodeList);

                //get all artifacts within a project
                let arrayOfObjects = [];
                for (let j = 2; j < artifactsNodeList.length; j++) {
                    let artifact = artifactsNodeList[j].children[0].children[0].innerHTML;
                    let timestamp = artifactsNodeList[j].children[1].innerHTML.trim();
                    let convertedDate = moment(timestamp, 'dddd MMM DD HH:mm:ss ZZZ YYYY');
                    let convertedDateUnix = convertedDate.unix();
                    //console.log(artifact, convertedDateUnix);
                    arrayOfObjects.push({
                        'artifactName': artifact,
                        'uploadDate': convertedDateUnix
                    });
                }

                //sort array by uploadDate property
                arrayOfObjects.sort(function (obj1, obj2) {
                    return obj1.uploadDate - obj2.uploadDate;
                });
                //console.log('Not sorted array=', arrayOfObjects);

                //remove all except last 40 items
                //exclude some projects that have more than one theme and require more items to stay
                if (repoName == 'repo1' && arrayOfProjects[i] == 'prj1') {
                    console.log('Leaving 100 last artifacts');
                    var resultArr = arrayOfObjects.slice(0, -100);
                } else if (repoName == 'repo2') {
                    console.log('Leaving 20 last artifacts');
                    var resultArr = arrayOfObjects.slice(0, -20);
                }

                for (let t = 0; t < resultArr.length; t++) {
                    //console.log('Deleting', resultArr[t].artifactName);
                    let url = `${nexusBaseActionUrl}/${repoName}/${arrayOfProjects[i]}/${resultArr[t].artifactName}`;
                    console.log('Deleting', url);
                    options.method = 'DELETE';
                    const respDel = await makeRequest(url, options);
                }

            } catch (e) {
                console.log(e);
            }

            //console.log(resp);
        }
    }
}

function checkArgs() {
    return {
        nexus_username: args.nxuser,
        nexus_pass: args.nxpass
    }
}

//entry point
let {nexus_username, nexus_pass} = checkArgs();
rotateArts(nexus_username, nexus_pass);
