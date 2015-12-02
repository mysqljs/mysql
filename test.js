		var mysql=require('./index.js')

		conn=mysql.createPool({
			host:'localhost',
			user:'root',
			password:''
		})

		conn.query('select ?',[{obj:true}],function(err,rows){
			console.log(rows)
		})
