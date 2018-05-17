"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const moment = require("moment");
const path = require("path");
const s = require("string");
const util = require("util");
const xmldom_1 = require("xmldom");
const Context_1 = require("./Context");
class SqlCommand {
    constructor() {
        this.sql = "";
        this.parameters = [];
    }
    addParameter(value) {
        this.parameters.push(value);
    }
}
class No {
    constructor(id, mapping) {
        this.id = id;
        this.children = [];
    }
    add(no) {
        this.children.push(no);
    }
    getSql(sqlcommand, data) {
        for (const prop in this.children) {
            if (prop in this.children) {
                const noson = this.children[prop];
                noson.getSql(sqlcommand, data);
            }
        }
        return sqlcommand;
    }
    getValue(data, path) {
        for (let i = 0; typeof data === "object" && i < path.length; ++i) {
            if (data) {
                data = data[path[i]];
            }
        }
        return data;
    }
    processexpression(expression, sqlcommand, data) {
        let myArray;
        const regex = new RegExp("#{([a-z.A-Z0-9_]+)}", "ig");
        while ((myArray = regex.exec(expression)) !== null) {
            const stretch = myArray[0];
            const propertyvalue = this.getValue(data, myArray[1].split("."));
            if (propertyvalue == null || typeof propertyvalue === "number" || typeof propertyvalue === "boolean" || typeof propertyvalue === "string") {
                expression = expression.replace(stretch, "?");
                sqlcommand.addParameter(propertyvalue);
            }
            else if (util.isDate(propertyvalue)) {
                const value = moment(propertyvalue).format("YYYY-MM-DD HH:mm:ss");
                expression = expression.replace(stretch, "?");
                sqlcommand.addParameter(value);
            }
            else if (util.isArray(propertyvalue)) {
                throw new Error("Can not translate snippet " + stretch + " by collection: " + propertyvalue);
            }
        }
        return expression;
    }
}
class NoString extends No {
    constructor(text, mapping) {
        super("", mapping);
        this.text = text.trim();
    }
    getSql(sqlcommand, data) {
        sqlcommand.sql += super.processexpression(this.text, sqlcommand, data) + " ";
    }
}
class NoChoose extends No {
    constructor(mapping) {
        super("", mapping);
    }
    add(no) {
        super.add(no);
        if (no instanceof NoOtherwise) {
            this.noOtherwise = no;
        }
    }
    getSql(sqlcommand, data) {
        for (const i in this.children) {
            const no = this.children[i];
            if (no instanceof NoWhen) {
                const nowhen = no;
                const expression = nowhen.expressionTest.replace("#{", "data.").replace("}", "");
                try {
                    eval("if( " + expression + " ) data.valueExpression = true; else data.valueExpression = false;");
                }
                catch (err) {
                    data.valueExpression = false;
                }
                if (data.valueExpression) {
                    return nowhen.getSql(sqlcommand, data);
                }
            }
        }
        if (this.noOtherwise) {
            return this.noOtherwise.getSql(sqlcommand, data);
        }
        return "";
    }
}
class NoWhen extends No {
    constructor(expressionTest, text, mapping) {
        super("", mapping);
        this.expressionTest = expressionTest;
        this.text = text;
        const regex = new RegExp("[_a-zA-Z][_a-zA-Z0-9]{0,30}", "ig");
        const identifiers = [];
        let myArray = [];
        while ((myArray = regex.exec(expressionTest)) !== null) {
            const identifier = myArray[0];
            if (identifier == "null" || identifier == "true" || identifier == "false" || identifier == "and") {
                continue;
            }
            identifiers.push(identifier);
            this.expressionTest = this.expressionTest.replace(identifier, "data." + identifier);
        }
        this.expressionTest = s(this.expressionTest).replaceAll("and", "&&").toString();
    }
}
class NoForEach extends No {
    constructor(item, index, separator, opening, closure, text, collection, mapping) {
        super("", mapping);
        this.item = item;
        this.index = index;
        this.separator = separator;
        this.opening = opening;
        this.closure = closure;
        this.collection = collection;
        this.text = text.trim();
    }
    getSql(sqlcommand, data) {
        const text = [];
        let collection = data[this.collection];
        if (collection == null) {
            if (util.isArray(data)) {
                collection = data;
            }
            else {
                return this.opening + this.closure;
            }
        }
        for (const item of collection) {
            let myArray;
            const regex = new RegExp("#{([a-z.A-Z]+)}", "ig");
            const expression = this.text;
            let newexpression = expression;
            while ((myArray = regex.exec(expression)) !== null) {
                const stretch = myArray[0];
                const property = myArray[1].replace(this.item + ".", "");
                const propertyvalue = this.getValue(item, property.split("."));
                if (typeof propertyvalue == "number" || typeof propertyvalue == "string" || typeof propertyvalue == "boolean") {
                    newexpression = newexpression.replace(stretch, "?");
                    sqlcommand.addParameter(propertyvalue);
                }
            }
            text.push(newexpression);
        }
        const sql = this.opening + text.join(this.separator) + this.closure;
        sqlcommand.sql += sql;
        return sqlcommand;
    }
}
class NoIf extends No {
    constructor(expressionTest, text, mapping) {
        super("", mapping);
        this.expressionTest = expressionTest;
        this.text = text;
        const regex = new RegExp("[_a-zA-Z][_a-zA-Z0-9]{0,30}", "ig");
        const identifiers = [];
        let myArray = [];
        while ((myArray = regex.exec(expressionTest)) !== null) {
            const identifier = myArray[0];
            if (identifier == "null") {
                continue;
            }
            identifiers.push(identifier);
            this.expressionTest = this.expressionTest.replace(identifier, "data." + identifier);
        }
    }
    getSql(sqlcommand, data) {
        const expression = this.expressionTest.replace("#{", "data.").replace("}", "");
        try {
            if (expression) {
                eval("if( " + expression + " ) data.valueExpression = true; else data.valueExpression = false;");
            }
        }
        catch (err) {
            data.valueExpression = false;
        }
        if (data.valueExpression == false) {
            return "";
        }
        super.getSql(sqlcommand, data) + " ";
    }
}
class NoOtherwise extends No {
    constructor(text, mapping) {
        super("", mapping);
        this.text = text;
    }
    getSql(sqlcommand, data) {
        let myArray;
        const regex = new RegExp("#{([a-z.A-Z]+)}", "ig");
        let expression = this.text;
        while ((myArray = regex.exec(this.text)) !== null) {
            const stretch = myArray[0];
            const propertyvalue = this.getValue(data, myArray[1].split("."));
            if (typeof propertyvalue == "number" || typeof propertyvalue == "string" || typeof propertyvalue == "boolean") {
                expression = expression.replace(stretch, "?");
                sqlcommand.addParameter(propertyvalue);
            }
        }
        sqlcommand.sql += expression + " ";
    }
}
class NoProperty {
    constructor(name, column, prefix) {
        this.name = name;
        this.column = column;
        this.prefix = prefix;
    }
    getColumn(prefix) {
        return prefix ? prefix + this.column : this.column;
    }
}
class NoPropertyId extends NoProperty {
    constructor(name, column) {
        super(name, column);
    }
}
class NoDiscriminator {
    constructor(javatype, column) {
        this.javatype = javatype;
        this.column = column;
        this.cases = [];
    }
    add(noCaseDiscriminator) {
        this.cases.push(noCaseDiscriminator);
    }
    getColumn(prefix) {
        return prefix ? prefix + this.column : this.column;
    }
}
class Main {
    constructor(pool) {
        this.pool = pool;
        this.context = new Context_1.default();
    }
    read(name, gchild, mapping) {
        const id = gchild.getAttributeNode("id").value;
        const incharge = new No(id, mapping);
        for (const no of Array.from(gchild.childNodes)) {
            if (no.nodeName == "choose") {
                this.readChoose(no, incharge, mapping);
            }
            else if (no.nodeName == "if") {
                this.readIf(no, incharge, mapping);
            }
            else if (no.nodeName == "foreach") {
                this.readForEach(no, incharge, mapping);
            }
            else {
                if (no.hasChildNodes() == false) {
                    const noString = new NoString(no.textContent, mapping);
                    incharge.add(noString);
                }
            }
        }
        return incharge;
    }
    readForEach(no, nomain, mapping) {
        let valueSeparador = "";
        if (no.getAttributeNode("separator")) {
            valueSeparador = no.getAttributeNode("separator").value;
        }
        let valueAverage = "";
        if (no.getAttributeNode("open")) {
            valueAverage = no.getAttributeNode("open").value;
        }
        let closingvalue = "";
        if (no.getAttributeNode("close")) {
            closingvalue = no.getAttributeNode("close").value;
        }
        let valueIndex = "";
        if (no.getAttributeNode("index")) {
            valueIndex = no.getAttributeNode("index").value;
        }
        let valueCollection = "";
        if (no.getAttributeNode("collection")) {
            valueCollection = no.getAttributeNode("collection").value;
        }
        const noday = new NoForEach(no.getAttributeNode("item").value, valueIndex, valueSeparador, valueAverage, closingvalue, no.textContent, valueCollection, mapping);
        nomain.add(noday);
    }
    readIf(no, nomain, mapping) {
        const noIf = new NoIf(no.getAttributeNode("test").value, no.childNodes[0].toString(), mapping);
        for (let i = 0; i < no.childNodes.length; i++) {
            const noson = no.childNodes[i];
            if (noson.nodeName == "choose") {
                this.readChoose(noson, noIf, mapping);
            }
            else if (noson.nodeName == "if") {
                this.readIf(noson, noIf, mapping);
            }
            else if (noson.nodeName == "foreach") {
                this.readForEach(noson, noIf, mapping);
            }
            else {
                if (noson.hasChildNodes() == false) {
                    const noString = new NoString(noson.textContent, mapping);
                    noIf.add(noString);
                }
            }
        }
        nomain.add(noIf);
    }
    readChoose(no, nomain, mapping) {
        const nohead = new NoChoose(mapping);
        for (const noson of no.childNodes) {
            if (noson.nodeName == "when") {
                nohead.add(this.readNoWhen(noson, no, mapping));
            }
            else if (noson.nodeName == "otherwise") {
                nohead.add(new NoOtherwise(noson.childNodes[0].toString(), mapping));
            }
        }
        nomain.add(nohead);
    }
    readNoWhen(no, noPrivate, mapping) {
        const expressionTest = no.getAttributeNode("test").value;
        const nowhen = new NoWhen(expressionTest, "", mapping);
        for (const noson of no.childNodes) {
            if (noson.nodeName == "choose") {
                this.readChoose(noson, nowhen, mapping);
            }
            else if (noson.nodeName == "if") {
                this.readIf(noson, nowhen, mapping);
            }
            else if (noson.nodeName == "foreach") {
                this.readForEach(noson, nowhen, mapping);
            }
            else {
                if (noson.hasChildNodes() == false) {
                    const noString = new NoString(noson.textContent, mapping);
                    nowhen.add(noString);
                }
            }
        }
        return nowhen;
    }
    process(dir_xml) {
        const mapNos = {};
        const templateManager = new TemplateMapManager(this.context, this.pool);
        const models = {};
        const stats = fs.statSync(dir_xml);
        if (stats.isFile()) {
            const mapping = this.processFile(dir_xml);
            templateManager.add(mapping);
            return templateManager;
        }
        else if (stats.isDirectory()) {
            const files = fs.readdirSync(dir_xml);
            for (const prop in files) {
                const archive = files[prop];
                const mapping = this.processFile(path.resolve(dir_xml, archive));
                templateManager.add(mapping);
            }
            return templateManager;
        }
    }
    processFile(filename) {
        if (fs.lstatSync(filename).isDirectory()) {
            return null;
        }
        const xml = fs.readFileSync(filename).toString();
        const xmlDoc = new xmldom_1.DOMParser().parseFromString(xml);
        if (xmlDoc.documentElement.nodeName != "mapper") {
            return null;
        }
        const we = xmlDoc.documentElement.childNodes;
        const mapping = new Mapping(xmlDoc.documentElement.getAttributeNode("namespace").value);
        for (const noXml of Array.from(we)) {
            if (noXml.nodeName != "#text" && noXml.nodeName != "#comment") {
                const no = this.read(noXml.nodeName, noXml, mapping);
                mapping.add(no);
            }
        }
        return mapping;
    }
}
exports.Main = Main;
class TemplateMapManager {
    constructor(context, pool) {
        this.mappings = [];
        this.mapMapping = {};
        this.context = context;
        this.pool = pool;
    }
    add(mapping) {
        if (mapping == null) {
            return;
        }
        this.mapMapping[mapping.name] = mapping;
        this.mappings.push(mapping);
    }
    getNo(fullnameResultMap) {
        const nameNamespace = fullnameResultMap.split(".")[0];
        const id = fullnameResultMap.split(".")[1];
        const mapping = this.mapMapping[nameNamespace];
        return mapping.getNo(id);
    }
    insert(fullname, object) {
        return new Promise((resolve, reject) => {
            const no = this.getNo(fullname);
            const sqlcommand = new SqlCommand();
            no.getSql(sqlcommand, object);
            this.connection((connection) => {
                connection.query(sqlcommand.sql, sqlcommand.parameters, (err, rows, fields) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(rows.affectedRows);
                });
            });
        });
    }
    update(fullname, object) {
        return new Promise((resolve, reject) => {
            const no = this.getNo(fullname);
            const sqlcommand = new SqlCommand();
            const sql = no.getSql(sqlcommand, object);
            this.connection((connection) => {
                connection.query(sqlcommand.sql, sqlcommand.parameters, function (err, rows, fields) {
                    if (err) {
                        reject(err);
                    }
                    resolve(rows.affectedRows);
                });
            });
        });
    }
    remove(fullname, object) {
        return new Promise((resolve, reject) => {
            const no = this.getNo(fullname);
            const sqlcommand = new SqlCommand();
            const sql = no.getSql(sqlcommand, object);
            this.connection((connection) => {
                connection.query(sqlcommand.sql, sqlcommand.parameters, (err, rows, fields) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(rows.affectedRows);
                });
            });
        });
    }
    async selectOne(fullname, data) {
        const objects = await this.selectList(fullname, data);
        if (objects.length == 1) {
            return objects[0];
        }
        return null;
    }
    async selectList(fullname, data) {
        return new Promise((resolve, reject) => {
            const no = this.getNo(fullname);
            const sqlcommand = new SqlCommand();
            no.getSql(sqlcommand, data);
            this.connection(connection => {
                connection.query(sqlcommand.sql, sqlcommand.parameters, (err, rows, fields) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(rows);
                });
            });
        });
    }
    connection(callback) {
        return this.context.getConnected(callback, this.pool);
    }
    transaction(callback) {
        return this.context.initiationTransaction(callback, this.pool);
    }
}
class Mapping {
    constructor(name) {
        this.name = name;
        this.children = [];
        this.nosPorId = {};
    }
    add(noson) {
        this.children.push(noson);
        this.nosPorId[noson.id] = noson;
    }
    getNo(id) {
        return this.nosPorId[id];
    }
}
//# sourceMappingURL=No.js.map