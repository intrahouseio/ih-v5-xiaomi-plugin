const { getGatewayCommand } = require('./lib/utils');


function parseId(string) {
  const temp = string.split('_');

  if (temp.length > 2) {
   const id = temp[temp.length - 1];
   const alias = temp.slice(0, temp.length - 1).join('_');
   return { id, alias };
  }
 return { id: temp[1], alias: temp[0] };
}

function compareDeviceList(old, now) {
  if (old.length === now.length) {
    let temp = false;
    old.forEach(id => {
      temp = !now.includes(id);
    });
    return temp;
  }
  return true;
}

function getNewDevice(dlist, slist) {
  let temp = null;
  if (slist.length === 0) {
    return false;
  }
  slist.forEach(i => {
    if (dlist.includes(i.sid)) {
      temp = i;
    }
  })
  return temp;
}


function commandScan(data) {
  const plugin = this.plugin;
  const xiaomi = this.xiaomi;
  const { id, alias } = parseId(data.id);
  const timer = setTimeout(timeout, 30000);

  let temp = [];

  function complete(device, sid) {
    if (device.sid === sid) {
      plugin.response('command', data);
    } else {
      plugin.response('command', data, false);
    }
  }

  function check(list) {
    clear();
    const old = xiaomi.getDeviceListOrigin();
    const test = compareDeviceList(old, list);
    const newdevice = getNewDevice(list, temp);
    if (test && newdevice) {
      xiaomi.once('device', device => complete(device, newdevice.sid));
      xiaomi.setDeviceListOrigin(list);
      xiaomi.addToDeviceList(newdevice)
    } else {
      plugin.response('command', data, false);
    }
  }

  function newdevice(data) {
    temp.push(data);
    if (temp.length === 1) {
      setTimeout(() => {
        xiaomi.on('devicelist', check);
        xiaomi.getDeviceList();
      }, 1000);
    }
  }

  function timeout() {
    clear();
    plugin.response('command', data, false);
  }

  function clear() {
    if (timer) {
      clearTimeout(timer);
    }
    xiaomi.removeListener('devicelist', check);
    xiaomi.removeListener('newdevice', newdevice);
  }


  xiaomi.on('newdevice', newdevice);
  xiaomi.sendAction(getGatewayCommand(xiaomi.getGatewayId(), 'add_device'));
}


function commandRemove(data) {
  const plugin = this.plugin;
  const xiaomi = this.xiaomi;
  const { id, alias } = parseId(data.id);
  const timer = setTimeout(timeout, 10000);

  function check(list) {
    clear();
    const old = xiaomi.getDeviceListOrigin();
    const test = compareDeviceList(old, list);
    if (test) {
      xiaomi.setDeviceListOrigin(list);
      xiaomi.removeToDeviceList(id);
      plugin.removeChannel(data.id);
      plugin.response('command', data);
    } else {
      plugin.response('command', data);
    }
  }

  function timeout() {
    clear();
    plugin.response('command', data, false);
  }

  function clear() {
    if (timer) {
      clearTimeout(timer);
    }
    xiaomi.removeListener('devicelist', check);
  }

  xiaomi.on('devicelist', check);
  xiaomi.sendAction(getGatewayCommand(xiaomi.getGatewayId(), 'remove_device', { id }));
  xiaomi.getDeviceList();
}

module.exports = {
  commandScan,
  commandRemove,
  parseId,
};
