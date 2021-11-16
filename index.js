const util = require('util');
const plugin = require('ih-plugin-api')();
const Xiaomi = require('./lib/xiaomi');

const { getDeviceValue, getDeviceAction } = require('./lib/utils');

let opt = {};
let settings = {};
let channels = [];
let folders = {};
let devices = {};

async function main() {
  opt = plugin.opt;
  settings = await plugin.params.get();

  const xiaomi = new Xiaomi(settings);

  xiaomi.on('message', data => plugin.log(data));
  xiaomi.on('send', data => plugin.log(data));

  xiaomi.on('devicelist', devices => {
    const list = devices.map(id => ({ id }));
    plugin.send({ type: 'syncFolders', data: list });
  });
  
  xiaomi.on('device', device => {
    const list = [];
    const values = [];

    if (folders[device.sid] === undefined) {
      devices[device.sid] = {};
      folders[device.sid] = true;
      const folder = { 
        id: device.sid, 
        title: `${device.model}_${device.sid}`,
        model: device.model,
        sid: device.sid,  
        folder: 1 
      };
      list.push(folder);
    }

    Object
      .keys(device.props)
      .forEach(propid => {
        devices[device.sid][propid] = device.props[propid];
        list.push({ 
          id: `${device.sid}_${propid}`, 
          title: propid,
          parent: device.sid 
        })
      });

    plugin.send({ type: 'upsertChannels', data: list });

    Object
      .keys(device.data)
      .forEach(propid => {
        values.push({ 
          id: `${device.sid}_${propid}`, 
          value: getDeviceValue(device.data[propid], device.alias)
        })
      });

    plugin.sendData(values);
  });

  xiaomi.on('data', device => {
    const values = [];
    Object
    .keys(device.data)
    .forEach(propid => {
      values.push({ 
        id: `${device.sid}_${propid}`, 
        value: getDeviceValue(device.data[propid], device.alias)
      })
    });

    plugin.sendData(values);
  });

  xiaomi.on('error', device => {

  });

  plugin.onAct(message => {
    if (message.data) {
      message.data.forEach(item => {
        plugin.log('PUBLISH command ' + util.inspect(item), 1);

        const temp = item.id.split('_');
        const id = temp[0];
        const propid = temp.slice(1).join('_');

        if (devices[id] !== undefined && devices[id][propid] !== undefined) {
          const alias = devices[id][propid].alias;
          const value = item.value;
          const payload = getDeviceAction(id, alias, ['', value]);
          
          plugin.log(JSON.stringify(payload));
          xiaomi.sendAction(payload);
        }
      });
    }
  });
}


main();

