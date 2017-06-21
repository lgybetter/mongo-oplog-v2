const MongoOplog = require('./index');
var posfile = './pos.txt';
var ns = 'test.posts';

const oplog = MongoOplog('mongodb://root:wangjiatest@test.bbcloud.com/admin', { ns, posfile});

// console.log(oplog);

oplog.tail();

oplog.on('op', doc => {
  console.log('op', doc);
});

oplog.on('error', error => {
  console.log(error);
});

oplog.on('end', () => {
  console.log('Stream ended');
});

oplog.stop(() => {
  console.log('server stopped');
});

oplog.on('insert', doc => {
  console.log('insert', doc);
});

oplog.on('update', doc => {
  console.log('update', doc);
});

oplog.on('delete', doc => {
  console.log('delete', doc.o._id);
});

传递到redis

有消息的时候通知其中一个客户端

