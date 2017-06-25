/**
 * Created by jiege on 17-6-25.
 */

module.exports = {
  envs: [
    {
      name: 'prod',
      mongodb: {
        uri:'',
        opts: {}
      }
    },
    {
      name: 'test',
      mongodb: {
        uri:'mongodb://root:wangjiatest@test.bbcloud.com/admin',
        opts: {}
      },
      tasks:[
        {
          ns: 'test.posts',
          posfile:'pos.txt',
          notifyUri:''
        }
      ]
    }
  ]
}