const mongodb = require("mongodb");
const MongoClient = mongodb.MongoClient;

const {envs} = require('./config');
console.log(envs);
for(let i=0;i<envs.length;i++){
  let env = envs[i];
  console.log(env);
  processEnv(env);
}

async function processEnv(env){

  let {mongodb, tasks} = env;
  let {uri, opts} = mongodb;
  if(!uri){
    return;
  }
  console.log('will connect', uri);
  let db = await MongoClient.connect(uri, opts);
  db = db.db('local');
  for(let i=0;i<tasks.length;i++){
    let {ns, posfile, notifyUri} = tasks[i];
    processTask({db, ns, posfile, notifyUri});
  }
}

async function processTask({db, ns, posfile, notifyUri}){
  const Timestamp = mongodb.Timestamp;
  const MongoOplog = require('./index');
  const rp = require('request-promise');

  let since;

  try {
    since = fs.readFileSync(posfile, "utf-8");
  } catch (err) {
    since = 0;
  }

  const fs = require('fs');

  let ts;
  if(typeof since === 'string'){
    ts = Timestamp.fromString(since);
  }else{
    let now = Math.floor((new Date()).getTime() / 1000);
    ts = new Timestamp(0, now);
  }
  if(!ns){
    return;
  }
  const oplog = MongoOplog({ db, ns, ts});

// console.log(oplog);

  oplog.tail();
  let docs = [];
  let timeoutId = null;
  function startSendDocLoop(timeout){
    clearTimeout(timeoutId);timeoutId = null;
    if(docs.length){
      timeoutId = setTimeout(sendDoc, timeout);
    }
  }
  oplog.on('op', (doc) => {
    console.log('op', doc);
    docs.push(doc);
    startSendDocLoop(0);
  });

  async function sendDoc(){

    let doc = docs[0];
    if(!doc)return;

    try{

      let result = {status: 'ok'};
      if(notifyUri){
        result = await rp({
          uri: notifyUri,
          method: 'POST',
          json: true,
          body: {
            doc
          }
        });
      }

      if(result.status === 'ok'){
        let ts = doc.ts;
        if(posfile){
          console.log('writing ts', ts, 'to posfile', posfile);
          fs.writeFileSync(posfile, ts);
        }
        docs.shift();
      }
    }catch(err){
      console.log(ns, err);
      return startSendDocLoop(5000);
    }

    startSendDocLoop(1000);

  }

  oplog.on('error', error => {
    console.log(ns, error);
  });

  oplog.on('end', () => {
    console.log(ns, 'Stream ended');
  });

  oplog.stop(() => {
    console.log(ns, 'server stopped');
  });
}