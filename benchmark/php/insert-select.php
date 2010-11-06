<?php
$INSERTS = 10000;

$config = array(
  'host' => 'localhost',
  'port' => 3306,
  'user' => 'root',
  'password' => 'root',
  'db' => 'node_mysql_test',
  'table' => 'post',
);
extract($config);

$connection = mysql_connect($host, $user, $password);
mysql_query('USE '.$db, $connection);
mysql_query('CREATE TEMPORARY TABLE '.$table.' ('.
'id INT(11) AUTO_INCREMENT, '.
'title VARCHAR(255), '.
'text TEXT, '.
'created DATETIME, '.
'PRIMARY KEY (id));', $connection);

$start = microtime(true);
for ($i = 0; $i < $INSERTS; $i++) {
  mysql_query('INSERT INTO '.$table.' SET title = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";', $connection);
}
$duration = (microtime(true) - $start);
$insertsPerSecond = $INSERTS / $duration;
echo sprintf("%d inserts / second\n", $insertsPerSecond);
echo sprintf("%d ms\n", $duration * 1000);

$start = microtime(true);
$q = mysql_query('SELECT * FROM '.$table);
while ($a = mysql_fetch_assoc($q)) {
}
$duration = (microtime(true) - $start);
$rowsPerSecond = $INSERTS / $duration;
echo sprintf("%d rows / second\n", $rowsPerSecond);
echo sprintf("%d ms\n", $duration * 1000);
?>
