MyBatisNodeJs
=============

MyBatisNodeJs is a port from the The MyBatis data mapper framework for Node.Js.

MyBatisNodeJs understands the same xml files as input like MyBatis Java.

* How to use:

1) Write your MyBatis mapping files:

To Know how to write mapping files read: 
http://mybatis.github.io/mybatis-3/

2) Create a connection to your database

```javascript
const mysql = require('mysql');
const pool = mysql.createPool({
    host     : 'localhost',
    user     : '****',
    password : '****',
    database : 'database',
    typeCast : true,
    multipleStatements: true
});
```

3) To process the xml mapping files and get an sessionFactory instance:

```javascript
const mybatis = require('mybatis-node');
const sessionFactory  = new mybatis(pool).process(dir_xml);
```

The string variable dir_xml points to the MyBatis mapping files directory.

The variable sessionFactory has methods for selectOne, selectList, insert, update or delete objects.

4) Select one object:

```javascript
sessionFactory.selectOne('user.select', {id: 1}, pool, function(user) {
   //console.log(user);
});
```

The callback function is called with the user or null if not found.
