#!/usr/bin/env node

var sys = require("sys"),
    pcap = require("pcap"),
    mysqlPort = parseInt(process.argv[3]) || 3306,
    pcap_session = pcap.createSession(process.argv[2] || '', 'tcp port '+mysqlPort);

sys.puts('This tool allows to reverse engineer the mysql procotocol using node-pcap.');
sys.puts('');
sys.puts('Available devices (active one is denoted by *):');

// Print all devices, currently listening device prefixed with an asterisk
pcap_session.findalldevs().forEach(function (dev) {
    sys.print('  ');
    if (pcap_session.device_name === dev.name) {
        sys.print("* ");
    }
    sys.print(dev.name + " ");
    if (dev.addresses.length > 0) {
        dev.addresses.forEach(function (address) {
            sys.print(address.addr + "/" + address.netmask);
        });
        sys.print("\n");
    } else {
        sys.print("no address\n");
    }
});

sys.puts('');
sys.puts('Execute `./pcap-mysql.js <device> <mysql-port>` to listen on another device.');
sys.puts('');

// Listen for packets, decode them, and feed the simple printer.  No tricks.
pcap_session.on('packet', function (raw_packet) {
    var packet = pcap.decode.packet(raw_packet);
    //sys.puts(pcap.print.packet(packet));
    var tcp = packet.link.ip.tcp;
    if (!tcp.data) {
      return;
    }

    if (tcp.sport == mysqlPort) {
      sys.puts('<- '+tcp.data.inspect());
    } else {
      sys.puts('-> '+tcp.data.inspect());
    }
});

