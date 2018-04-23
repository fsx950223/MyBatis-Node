import * as fs from "fs";
import * as moment from "moment";
import * as path from "path";
import * as s from "string";
import * as util from "util";
import {DOMParser} from "xmldom";
import Context from "./Context";
class SqlCommand {
    public sql;
    public parameters;
    constructor() {
        this.sql = "";
        this.parameters = [];
    }
    public addParameter(value) {
        this.parameters.push(value);
    }
}

class No {
    public id;
    public mapping;
    public children;
    constructor(id, mapping) {
        this.id = id;
        this.mapping = mapping;
        this.children = [];
    }
    public add(no) {
        this.children.push(no);
    }
    public print() {
        if (this.id) {
            console.log(this.id);
        }
        for (const i in this.children) {
            const noson = this.children[i];
            noson.print();
        }
    }
    public getSql(sqlcommand, data) {
        for (const prop in this.children) {
            if (prop in this.children) {
                const noson = this.children[prop];
                noson.getSql(sqlcommand, data);
            }
        }
        return sqlcommand;
    }
    public getValue(data, path) {
        let i, len = path.length;
        for (i = 0; typeof data === "object" && i < len; ++i) {
            if (data) {
                data = data[path[i]];
            }
        }
        return data;
    }
    public getFullName() {
        return this.mapping.name + "." + this.id;
    }
    public processexpression(expression, sqlcommand, data) {
        let myArray;
        const regex = new RegExp("#{([a-z.A-Z0-9_]+)}", "ig");
        while ((myArray = regex.exec(expression)) !== null) {
            const stretch = myArray[0];
            const propertyvalue = this.getValue(data, myArray[1].split("."));
            if (propertyvalue == null) {
                expression = expression.replace(stretch, "?");
                sqlcommand.addParameter(null);
            } else if (typeof propertyvalue === "number") {
                expression = expression.replace(stretch, "?");
                sqlcommand.addParameter(propertyvalue);
            } else if (typeof propertyvalue === "string") {
                expression = expression.replace(stretch, "?");
                sqlcommand.addParameter(propertyvalue);
            } else if (typeof propertyvalue === "boolean") {
                expression = expression.replace(stretch, "?");
                sqlcommand.addParameter(propertyvalue);
            } else if (util.isDate(propertyvalue)) {
                const value = moment(propertyvalue).format("YYYY-MM-DD HH:mm:ss");
                expression = expression.replace(stretch, "?");
                sqlcommand.addParameter(value);
            } else if (util.isArray(propertyvalue)) {
                throw new Error("Can not translate snippet " + stretch + " by collection: " + propertyvalue);
            }
        }
        return expression;
    }
}

class NoString extends No {
    public text;
    constructor(text, mapping) {
        super("", mapping);
        this.text = text.trim();
    }
    public print() {
        console.log(this.text);
    }
    public getSql(sqlcommand, data) {
        sqlcommand.sql += super.processexpression(this.text, sqlcommand, data) + " ";
    }
}

class NoChoose extends No {
    public noOtherwise;
    public children;

    constructor(mapping) {
        super("", mapping);
    }
    public add(no) {
        super.add(no);
        if (no instanceof NoOtherwise) {
            this.noOtherwise = no;
        }
    }
    public getSql(sqlcommand, data) {
        for (const i in this.children) {
            const no = this.children[i];
            if (no instanceof NoWhen) {
                const nowhen = no;
                const expression = nowhen.expressionTest.replace("#{", "data.").replace("}", "");
                try {
                    eval("if( " + expression + " ) data.valueExpression = true; else data.valueExpression = false;");
                } catch (err) {
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
    public expressionTest;
    public text;
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
    public print() {
        console.log("when(" + this.expressionTest + "): " + this.text);
    }
}

class NoForEach extends No {
    public item;
    public index;
    public separator;
    public opening;
    public closure;
    public collection;
    public text;
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
    public getSql(sqlcommand, data) {
        const text = [];
        let collection = data[this.collection];
        if (collection == null) {
            if (util.isArray(data)) {
                collection = data;
            } else {
                return this.opening + this.closure;
            }
        }
        for (let i = 0; i < collection.length; i++) {
            const item = collection[i];
            let myArray;
            const regex = new RegExp("#{([a-z.A-Z]+)}", "ig");
            const expression = this.text;
            let newexpression = expression;
            while ((myArray = regex.exec(expression)) !== null) {
                const stretch = myArray[0];
                const property = myArray[1].replace(this.item + ".", "");
                const propertyvalue = this.getValue(item, property.split("."));
                if (typeof propertyvalue == "number") {
                    newexpression = newexpression.replace(stretch, "?");
                    sqlcommand.addParameter(propertyvalue);
                } else if (typeof propertyvalue == "string") {
                    newexpression = newexpression.replace(stretch, "?");
                    sqlcommand.addParameter(propertyvalue);
                } else if (typeof propertyvalue == "boolean") {
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
    public expressionTest;
    public text;
    constructor(expressionTest, text, mapping) {
        super( "", mapping);
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
    public print() {
        console.log("if(" + this.expressionTest + "): " + this.text);
    }
    public getSql(sqlcommand, data) {
        const expression = this.expressionTest.replace("#{", "data.").replace("}", "");
        try {
            if (expression) {
            eval("if( " + expression + " ) data.valueExpression = true; else data.valueExpression = false;");
            }
        } catch (err) {
            data.valueExpression = false;
        }
        if (data.valueExpression == false) {
            return "";
        }
        super.getSql(sqlcommand, data) + " ";
    }
}

class NoOtherwise extends No {
    public text;
    constructor(text, mapping) {
        super( "", mapping);
        this.text = text;
    }
    public print() {
        console.log("otherwise(" + this.text + ")");
    }
    public getSql(sqlcommand, data) {
        let myArray;
        const regex = new RegExp("#{([a-z.A-Z]+)}", "ig");
        let expression = this.text;
        while ((myArray = regex.exec(this.text)) !== null) {
            const stretch = myArray[0];
            const propertyvalue = this.getValue(data, myArray[1].split("."));
            if (typeof propertyvalue == "number") {
                expression = expression.replace(stretch, "?");
                sqlcommand.addParameter(propertyvalue);
            } else if (typeof propertyvalue == "string") {
                expression = expression.replace(stretch, "?");
                sqlcommand.addParameter(propertyvalue);
            } else if (typeof propertyvalue == "boolean") {
                expression = expression.replace(stretch, "?");
                sqlcommand.addParameter(propertyvalue);
            }
        }
        sqlcommand.sql += expression + " ";
    }
}

class NoProperty {
    public name;
    public column;
    public prefix;
    constructor(name, column, prefix?) {
        this.name = name;
        this.column = column;
        this.prefix = prefix;
    }
    public print() {
        console.log(this.name + " -> " + this.getColumn());
    }
    public getColumn(prefix?) {
        return prefix ? prefix + this.column : this.column;
    }
}

class NoPropertyId extends NoProperty {
    constructor(name, column) {
        super(name, column);
    }
}

class NoDiscriminator {
    public javatype;
    public column;
    public cases;
    constructor(javatype, column) {
        this.javatype = javatype;
        this.column = column;
        this.cases = [];
    }
    public add(noCaseDiscriminator) {
        this.cases.push(noCaseDiscriminator);
    }
    public print() {
        console.log("discriminator(" + this.javatype + " " + this.column + ")");
        for (const i in this.cases) {
            const nochase = this.cases[i];
            nochase.print();
        }
    }
    public getColumn(prefix) {
        return prefix ? prefix + this.column : this.column;
    }
}

class Main {
    public context;
    public pool;
    constructor(pool) {
        this.pool = pool;
        this.context = new Context();
    }
    public read(name, gchild:Node&ChildNode, mapping) {
        const id = (<Element>gchild).getAttributeNode("id").value;
        const incharge = new No(id, mapping);
        for (const no of Array.from(gchild.childNodes)) {
            if (no.nodeName == "choose") {
                this.readChoose("choose", no, incharge, mapping);
            } else if (no.nodeName == "if") {
                this.readit("choose", no, incharge, mapping);
            } else if (no.nodeName == "foreach") {
                this.readForEach("foreach", no, incharge, mapping);
            } else {
                if (no.hasChildNodes() == false) {
                    const noString = new NoString(no.textContent, mapping);
                    incharge.add(noString);
                }
            }
        }
        return incharge;
    }
    public readForEach(name, no, nomain, mapping) {
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
    public readit(name, no, nomain, mapping) {
        const noIf = new NoIf(no.getAttributeNode("test").value, no.childNodes[0].toString(), mapping);
        for (let i = 0; i < no.childNodes.length; i++) {
            const noson = no.childNodes[i];
            if (noson.nodeName == "choose") {
                this.readChoose("choose", noson, noIf, mapping);
            } else if (noson.nodeName == "if") {
                this.readit("choose", noson, noIf, mapping);
            } else if (noson.nodeName == "foreach") {
                this.readForEach("foreach", noson, noIf, mapping);
            } else {
                if (noson.hasChildNodes() == false) {
                    const noString = new NoString(noson.textContent, mapping);
                    noIf.add(noString);
                }
            }
        }
        nomain.add(noIf);
    }
    public readChoose(name, no, nomain, mapping) {
        const nohead = new NoChoose(mapping);
        for (let i = 0; i < no.childNodes.length; i++) {
            const children = no.childNodes;
            const noson = children[i];
            if (noson.nodeName == "when") {
                nohead.add(this.readNoWhen("when", noson, no, mapping));
            } else if (noson.nodeName == "otherwise") {
                nohead.add(new NoOtherwise(noson.childNodes[0].toString(), mapping));
            }
        }
        nomain.add(nohead);
    }
    public readNoWhen(name, no, noPrivate, mapping) {
        const expressionTest = no.getAttributeNode("test").value;
        const nowhen = new NoWhen(expressionTest, "", mapping);
        for (let i = 0; i < no.childNodes.length; i++) {
            const noson = no.childNodes[i];
            if (noson.nodeName == "choose") {
                this.readChoose("choose", noson, nowhen, mapping);
            } else if (noson.nodeName == "if") {
                this.readit("choose", noson, nowhen, mapping);
            } else if (noson.nodeName == "foreach") {
                this.readForEach("foreach", noson, nowhen, mapping);
            } else {
                if (noson.hasChildNodes() == false) {
                    const noString = new NoString(noson.textContent, mapping);
                    nowhen.add(noString);
                }
            }
        }
        return nowhen;
    }
    public process(dir_xml) {
        const mapNos = {};
        const templateManager = new TemplateMapManager(this.context, this.pool);
        const models = {};
        const files = fs.readdirSync(dir_xml);
        for (const prop in files) {
            const archive = files[prop];
            const mapping = this.processFile(dir_xml + archive);
            templateManager.add(mapping);
        }
        return templateManager;
    }
    public processFile(filename) {
        if (fs.lstatSync(filename).isDirectory()) {
            return null;
        }
        const xml = fs.readFileSync(filename).toString();
        const xmlDoc = new DOMParser().parseFromString(xml);
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

class TemplateMapManager {
    public mappings;
    public mapMapping;
    public context;
    public pool;
    constructor(context, pool) {
        this.mappings = [];
        this.mapMapping = {};
        this.context = context;
        this.pool = pool;
    }
    public add(mapping) {
        if (mapping == null) {
            return;
        }
        this.mapMapping[mapping.name] = mapping;
        this.mappings.push(mapping);
    }
    public getNo(fullnameResultMap) {
        const nameNamespace = fullnameResultMap.split(".")[0];
        const id = fullnameResultMap.split(".")[1];
        const mapping = this.mapMapping[nameNamespace];
        return mapping.getNo(id);
    }
    public insert(fullname, object) {
        return new Promise((resolve, reject) => {
            const no = this.getNo(fullname);
            const sqlcommand = new SqlCommand();
            no.getSql(sqlcommand, object);
            this.connection(function(connection) {
                connection.query(sqlcommand.sql, sqlcommand.parameters, function(err, rows, fields) {
                    if (err) {
                        reject(err);
                    }
                    resolve(rows.affectedRows);
                });
            });
        });
    }
    public update(fullname, object) {
        return new Promise((resolve, reject) => {
            const no = this.getNo(fullname);
            const sqlcommand = new SqlCommand();
            const sql = no.getSql(sqlcommand, object);

            this.connection(function(connection) {
                connection.query(sqlcommand.sql, sqlcommand.parameters, function(err, rows, fields) {
                    if (err) {
                        reject(err);
                    }
                    resolve(rows.affectedRows);
                });
            });
        });
    }
    public remove(fullname, object) {
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
    public selectOne(fullname, data) {
        return new Promise((resolve, reject) => {
            this.selectList(fullname, data).then((objects) => {
                if ((objects as any[]).length == 1) {
                    resolve(objects[0]);
                }
                resolve(null);
            });
        });
    }
    public selectList(fullname, data) {
        return new Promise((resolve, reject) => {
            const no = this.getNo(fullname);
            const sqlcommand = new SqlCommand();
            no.getSql(sqlcommand, data);
            this.connection(function(connection) {
                connection.query(sqlcommand.sql, sqlcommand.parameters, function(err, rows, fields) {
                    if (err) {
                        reject(err);
                    }
                    resolve(rows);
                });
            });
        });
    }
    public connection(callback) {
        return this.context.getConnected(callback, this.pool);
    }
    public transaction(callback) {
        return this.context.initiationTransaction(callback, this.pool);
    }
}

class Mapping {
    public name;
    public children;
    public nosPorId;
    constructor(name) {
        this.name = name;
        this.children = [];
        this.nosPorId = {};
    }
    public add(noson) {
        noson.mapping = this;
        this.children.push(noson);
        this.nosPorId[noson.id] = noson;
    }

    public getNo(id) {
        return this.nosPorId[id];
    }
}

export {Main};
