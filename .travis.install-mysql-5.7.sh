sudo DEBIAN_FRONTEND=noninteractive apt-get -y -q remove --purge "^mysql.*"
sudo rm -rf /var/lib/mysql /var/log/mysql /etc/mysql
sudo DEBIAN_FRONTEND=noninteractive apt-get -y -q autoremove
sudo DEBIAN_FRONTEND=noninteractive apt-get -y -q autoclean
sudo deluser mysql
sudo service apparmor restart
wget https://dev.mysql.com/get/mysql-apt-config_0.7.3-1_all.deb
sudo DEBIAN_FRONTEND=noninteractive dpkg --force-confold --install mysql-apt-config_0.7.3-1_all.deb
echo mysql-apt-config        mysql-apt-config/preview-component      string | sudo debconf-set-selections
echo mysql-apt-config        mysql-apt-config/repo-url       string  http://repo.mysql.com/apt | sudo debconf-set-selections
echo mysql-apt-config        mysql-apt-config/select-product select  Ok | sudo debconf-set-selections
echo mysql-apt-config        mysql-apt-config/select-tools   select  Disabled | sudo debconf-set-selections
echo mysql-apt-config        mysql-apt-config/select-server  select  mysql-5.7 | sudo debconf-set-selections
echo mysql-apt-config        mysql-apt-config/select-preview select  Disabled | sudo debconf-set-selections
echo mysql-apt-config        mysql-apt-config/unsupported-platform   select  abort | sudo debconf-set-selections
echo mysql-apt-config        mysql-apt-config/repo-distro    select  ubuntu | sudo debconf-set-selections
echo mysql-apt-config        mysql-apt-config/tools-component        string | sudo debconf-set-selections
echo mysql-apt-config        mysql-apt-config/repo-codename  select  precise | sudo debconf-set-selections
echo mysql-apt-config        mysql-apt-config/tools-component        string | sudo debconf-set-selections
sudo DEBIAN_FRONTEND=noninteractive dpkg-reconfigure mysql-apt-config
sudo DEBIAN_FRONTEND=noninteractive apt-get -y -q update
echo mysql-community-server  mysql-community-server/root-pass        password pass | sudo debconf-set-selections
echo mysql-community-server  mysql-community-server/re-root-pass     password pass | sudo debconf-set-selections
echo mysql-community-server  mysql-community-server/root-pass-mismatch       error | sudo debconf-set-selections
echo mysql-community-server  mysql-community-server/data-dir note | sudo debconf-set-selections
echo mysql-community-server  mysql-community-server/remove-data-dir  boolean false | sudo debconf-set-selections
sudo DEBIAN_FRONTEND=noninteractive apt-get -q -y -f install mysql-server
