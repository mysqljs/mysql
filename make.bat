@ECHO OFF
REM Simple 'make' replacement for windows-based system, 'npm test' will now find
REM 'make.bat' and sets the MYSQL_ enviroment variables according to this file

REM Edit the variables according to your system
REM No spaces (' ') between variablenames, '=' and the values!

REM Host to test with default: localhost
SET MYSQL_HOST=localhost

REM Default mysql port: 3306
SET MYSQL_PORT=3306

REM For a standard installatons of Wampp using http://www.apachefriends.org/
REM the default login is 'root' and no password, but any user should do, change
REM  the settings according to your installation
SET MYSQL_USER=root
SET MYSQL_PASSWORD=

REM make sure the database you are using exists and the above user has access to
REM it. Normally every user has access to the database 'test'
SET MYSQL_DATABASE=test

@ECHO ON
node test/run.js
@ECHO OFF
ECHO **********************
ECHO If the tests should fail, make sure you have SET the correct values for the enviroment variables in the file 'make.bat'
ECHO **********************