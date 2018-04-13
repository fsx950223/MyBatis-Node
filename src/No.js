var dir_xml = '', separator = ':::';
var __extends = this.__extends || function (d, B) {
    for (var P in B)
        if (B.hasOwnProperty(P))
            d[P] = B[P];
    function __() {
        this.constructor = d;
    }
    __.prototype = B.prototype;
    d.prototype = new __();
};
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var useful = require('util');
var moment = require('moment');
var DOMParser = require('xmldom').DOMParser;
var s = require('string');
var Context = require('./Context');
function SqlCommand() {
    this.sql = '';
    this.parameters = [];
}
SqlCommand.prototype.addParameter = function (value) {
    this.parameters.push(value);
};
var Atthe = function () {
    function Atthe(id, mapping) {
        this.id = id;
        this.mapeamento = mapping;
        this.filhos = [];
    }
    Atthe.prototype.add = function (atthe) {
        this.filhos.push(atthe);
    };
    Atthe.prototype.print = function () {
        if (this.id)
            console.log(this.id);
        for (var i in this.filhos) {
            var noson = this.filhos[i];
            noson.print();
        }
    };
    Atthe.prototype.getSql = function (sqlcommand, data) {
        for (var i in this.filhos) {
            var noson = this.filhos[i];
            noson.getSql(sqlcommand, data);
        }
        return sqlcommand;
    };
    Atthe.prototype.getValue = function (data, path) {
        var i, len = path.length;
        for (i = 0; typeof givesyou === 'object' && i < len; ++i) {
            if (givesyou)
                data = givesyou[path[i]];
        }
        return givesyou;
    };
    Atthe.prototype.getFullName = function () {
        return this.mapeamento.name + '.' + this.id;
    };
    Atthe.prototype.processexpression = function (text, sqlcommand, data) {
        var myArray;
        var regex = new RegExp('#{([a-z.A-Z0-9_]+)}', 'ig');
        var expression = text;
        while ((myArray = regex.exec(text)) !== null) {
            var stretch = myArray[0];
            var propertyvalue = this.getValue(data, myArray[1].split('.'));
            if (propertyvalue == null) {
                expressao = expression.replace(stretch, '?');
                sqlcommand.addParameter(null);
            } else if (typeof propertyvalue == 'number') {
                expressao = expression.replace(stretch, '?');
                sqlcommand.addParameter(propertyvalue);
            } else if (typeof propertyvalue == 'string') {
                expressao = expression.replace(stretch, '?');
                sqlcommand.addParameter(propertyvalue);
            } else if (typeof propertyvalue == 'boolean') {
                expressao = expression.replace(stretch, '?');
                sqlcommand.addParameter(propertyvalue);
            } else if (useful.isDate(propertyvalue)) {
                var value = moment(propertyvalue).format('YYYY-MM-DD HH:mm:ss');
                expressao = expression.replace(stretch, '?');
                sqlcommand.addParameter(value);
            } else if (useful.isArray(propertyvalue)) {
                throw new Error('Não pode traduzir trecho ' + stretch + ' pela coleção: ' + propertyvalue);
            }
        }
        return expression;
    };
    return Atthe;
}();
exports.No = Atthe;
var NoSelect = function (_super) {
    __extends(NoSelect, _super);
    function NoSelect(id, resultMap, javaType, mapping) {
        _super.call(this, id, mapping);
        this.resultMap = resultMap;
        this.javaType = javaType;
    }
    return NoSelect;
}(Atthe);
exports.NoSelect = NoSelect;
var NoString = function (_super) {
    __extends(NoString, _super);
    function NoString(text, mapping) {
        _super.call(this, '', mapping);
        this.texto = text.trim();
    }
    NoString.prototype.print = function () {
        console.log(this.texto);
    };
    NoString.prototype.getSql = function (sqlcommand, data) {
        sqlcommand.sql += _super.prototype.processexpression.call(this, this.texto, sqlcommand, data) + ' ';
    };
    return NoString;
}(Atthe);
exports.NoString = NoString;
var NoChoose = function (_super) {
    __extends(NoChoose, _super);
    function NoChoose(mapping) {
        _super.call(this, '', mapping);
    }
    NoChoose.prototype.add = function (atthe) {
        _super.prototype.add.call(this, atthe);
        if (atthe instanceof NoOtherwise) {
            this.noOtherwise = atthe;
        }
    };
    NoChoose.prototype.getSql = function (sqlcommand, data) {
        for (var i in this.filhos) {
            var atthe = this.filhos[i];
            if (atthe instanceof Nowhen) {
                var nowhen = atthe;
                var expression = nowhen.expressionTest.replace('#{', 'dados.').replace('}', '');
                try {
                    eval('if( ' + expression + ' ) dados.valueExpression = true; else dados.valueExpression = false;');
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
        return '';
    };
    return NoChoose;
}(Atthe);
exports.NoChoose = NoChoose;
var Nowhen = function (_super) {
    __extends(Nowhen, _super);
    function Nowhen(expressionTest, text, mapping) {
        _super.call(this, '', mapping);
        this.expressionTest = expressionTest;
        this.texto = text;
        var regex = new RegExp('[_a-zA-Z][_a-zA-Z0-9]{0,30}', 'ig');
        var identifiers = [];
        while ((myArray = regex.exec(expressionTest)) !== null) {
            var identifier = myArray[0];
            if (identifier == 'null' || identifier == 'true' || identifier == 'false' || identifier == 'and')
                continue;
            identifiers.push(identifier);
        }
        for (var i = 0; i < identifiers.length; i++) {
            var identifier = identifiers[i];
            this.expressionTest = this.expressionTest.replace(identifier, 'dados.' + identifier);
        }
        this.expressionTest = s(this.expressionTest).replaceAll('and', '&&').toString();
    }
    Nowhen.prototype.print = function () {
        console.log('when(' + this.expressionTest + '): ' + this.texto);
    };
    return Nowhen;
}(Atthe);
exports.NoWhen = Nowhen;
var NoForEach = function (_super) {
    __extends(NoForEach, _super);
    function NoForEach(item, index, separator, opening, closure, text, collection, mapping) {
        _super.call(this, '', mapping);
        this.item = item;
        this.index = index;
        this.separador = separator;
        this.abertura = opening;
        this.fechamento = closure;
        this.collection = collection;
        this.texto = text.trim();
    }
    NoForEach.prototype.getSql = function (sqlcommand, data) {
        var text = [];
        var collection = data[this.collection];
        if (collection == null) {
            if (useful.isArray(data)) {
                colecao = data;
            } else {
                return this.abertura + this.fechamento;
            }
        }
        for (var i = 0; i < collection.length; i++) {
            var item = collection[i];
            var myArray;
            var regex = new RegExp('#{([a-z.A-Z]+)}', 'ig');
            var expression = this.texto;
            var newexpression = expression;
            while ((myArray = regex.exec(expression)) !== null) {
                var stretch = myArray[0];
                var property = myArray[1].replace(this.item + '.', '');
                var propertyvalue = this.getValue(item, property.split('.'));
                if (typeof propertyvalue == 'number') {
                    novaExpressao = newexpression.replace(stretch, '?');
                    sqlcommand.addParameter(propertyvalue);
                } else if (typeof propertyvalue == 'string') {
                    novaExpressao = newexpression.replace(stretch, '?');
                    sqlcommand.addParameter(propertyvalue);
                } else if (typeof propertyvalue == 'boolean') {
                    novaExpressao = newexpression.replace(stretch, '?');
                    sqlcommand.addParameter(propertyvalue);
                }
            }
            text.push(newexpression);
        }
        var sql = this.abertura + text.join(this.separador) + this.fechamento;
        sqlcommand.sql += sql;
        return sqlcommand;
    };
    return NoForEach;
}(Atthe);
exports.NoForEach = NoForEach;
var NoIf = function (_super) {
    __extends(NoIf, _super);
    function NoIf(expressionTest, text, mapping) {
        _super.call(this, '', mapping);
        this.expressionTest = expressionTest;
        this.texto = text;
        var regex = new RegExp('[_a-zA-Z][_a-zA-Z0-9]{0,30}', 'ig');
        var identifiers = [];
        while ((myArray = regex.exec(expressionTest)) !== null) {
            var identifier = myArray[0];
            if (identifier == 'null')
                continue;
            identifiers.push(identifier);
        }
        for (var i = 0; i < identifiers.length; i++) {
            var identifier = identifiers[i];
            this.expressionTest = this.expressionTest.replace(identifier, 'dados.' + identifier);
        }
    }
    NoIf.prototype.print = function () {
        console.log('if(' + this.expressionTest + '): ' + this.texto);
    };
    NoIf.prototype.getSql = function (sqlcommand, data) {
        var expression = this.expressionTest.replace('#{', 'dados.').replace('}', '');
        try {
            eval('if( ' + expression + ' ) dados.valueExpression = true; else dados.valueExpression = false;');
        } catch (err) {
            data.valueExpression = false;
        }
        if (data.valueExpression == false) {
            return '';
        }
        _super.prototype.getSql.call(this, sqlcommand, data) + ' ';
    };
    return NoIf;
}(Atthe);
exports.NoIf = NoIf;
var NoOtherwise = function (_super) {
    __extends(NoOtherwise, _super);
    function NoOtherwise(text, mapping) {
        _super.call(this, '', mapping);
        this.texto = text;
    }
    NoOtherwise.prototype.print = function () {
        console.log('otherwise(' + this.texto + ')');
    };
    NoOtherwise.prototype.getSql = function (sqlcommand, data) {
        var myArray;
        var regex = new RegExp('#{([a-z.A-Z]+)}', 'ig');
        var expression = this.texto;
        while ((myArray = regex.exec(this.texto)) !== null) {
            var stretch = myArray[0];
            var propertyvalue = this.getValue(data, myArray[1].split('.'));
            if (typeof propertyvalue == 'number') {
                expressao = expression.replace(stretch, '?');
                sqlcommand.addParameter(propertyvalue);
            } else if (typeof propertyvalue == 'string') {
                expressao = expression.replace(stretch, '?');
                sqlcommand.addParameter(propertyvalue);
            } else if (typeof propertyvalue == 'boolean') {
                expressao = expression.replace(stretch, '?');
                sqlcommand.addParameter(propertyvalue);
            }
        }
        sqlcommand.sql += expression + ' ';
    };
    return NoOtherwise;
}(Atthe);
exports.NoOtherwise = NoOtherwise;
var NoProperty = function () {
    function NoProperty(name, column, prefix) {
        this.name = name;
        this.column = column;
        this.prefix = prefix;
    }
    NoProperty.prototype.print = function () {
        console.log(this.name + ' -> ' + this.getColumn());
    };
    NoProperty.prototype.getColumn = function (prefix) {
        return prefix ? prefix + this.column : this.column;
    };
    NoProperty.prototype.createObject = function (templateManager, objectcache, object, record, keyphrase) {
        return null;
    };
    return NoProperty;
}();
exports.NoProperty = NoProperty;
var NoPropriedadeId = function (_super) {
    __extends(NoPropriedadeId, _super);
    function NoPropriedadeId(name, column) {
        _super.call(this, name, column);
    }
    return NoPropriedadeId;
}(NoProperty);
exports.NoPropriedadeId = NoPropriedadeId;
var Noaffiliation = function (_super) {
    __extends(Noaffiliation, _super);
    function Noaffiliation(name, column, columnPrefix, resultMap) {
        _super.call(this, name, column, columnPrefix);
        this.resultMap = resultMap;
    }
    Noaffiliation.prototype.print = function () {
        console.log('associacao(' + this.name + separator + this.getColumn(this.prefix) + ' -> ' + this.resultMap);
    };
    Noaffiliation.prototype.getFullName = function () {
        if (this.resultMap.indexOf('.') == -1) {
            return this.name + '.' + this.resultMap;
        }
        return this.resultMap;
    };
    Noaffiliation.prototype.createObject = function (templateManager, objectcache, ancestorCache, object, record, keyphrase, prefix) {
        var atthe = templateManager.getResultMap(this.resultMap);
        if (!atthe)
            throw new Error('Nenhum nó com name foi encontrado: ' + this.resultMap);
        var keyobject = atthe.getChave(record, keyphrase, this.prefix || prefix);
        var combinedkey = atthe.getChaveCombined(keyphrase, keyobject);
        var objectknown = objectcache[combinedkey] != null;
        var objectCollection = atthe.createObject(templateManager, objectcache, ancestorCache, record, keyphrase, this.prefix || prefix);
        if (objectCollection == null || objectknown == true)
            return;
        object[this.name] = objectCollection;
    };
    return Noaffiliation;
}(NoProperty);
exports.Noaffiliation = Noaffiliation;
var NoPropriacaoColecao = function (_super) {
    __extends(NoPropriacaoColecao, _super);
    function NoPropriacaoColecao(name, column, prefix, resultMap, ofType, javatype) {
        _super.call(this, name, column, prefix);
        this.resultMap = resultMap;
        this.ofType = ofType;
        this.javatype = javatype;
    }
    NoPropriacaoColecao.prototype.print = function () {
        console.log('colecao(' + this.name + separator + this.column + ' -> ' + this.resultMap);
    };
    NoPropriacaoColecao.prototype.createObject = function (templateManager, objectcache, ancestorCache, object, record, keyphrase, prefix) {
        var atthe = templateManager.getResultMap(this.resultMap);
        var keyobject = atthe.getChave(record, keyphrase, this.prefix || prefix);
        var combinedkey = keyphrase + separator + keyobject;
        var objectknown = objectcache[combinedkey] != null;
        var objectCollection = atthe.createObject(templateManager, objectcache, ancestorCache, record, keyphrase, this.prefix || prefix);
        if (object[this.name] == null)
            object[this.name] = [];
        if (objectCollection == null || objectknown == true)
            return;
        object[this.name].push(objectCollection);
    };
    return NoPropriacaoColecao;
}(NoProperty);
exports.NoPropriacaoColecao = NoPropriacaoColecao;
var NoResultMap = function (_super) {
    __extends(NoResultMap, _super);
    function NoResultMap(id, type, mapping) {
        _super.call(this, id, mapping);
        this.type = type;
        this.properties = [];
        this.propertiesId = [];
    }
    NoResultMap.prototype.setIdProperty = function (propertyId) {
        this.propertiesId.push(propertyId);
    };
    NoResultMap.prototype.findPropertyId = function () {
        var property = null;
        var i;
        var found = false;
        for (i = 0; i < this.properties.length; i++) {
            propriedade = this.properties[i];
            if (property.name == 'id') {
                encontrou = true;
                break;
            }
        }
        if (!found)
            return;
        this.setIdProperty(new NoPropriedadeId(property.name, property.getColumn()));
        this.properties.splice(i, 1);
    };
    NoResultMap.prototype.defineDiscriminator = function (nodiscriminator) {
        this.noDiscriminator = nodiscriminator;
    };
    NoResultMap.prototype.add = function (property) {
        this.properties.push(property);
    };
    NoResultMap.prototype.print = function () {
        for (var i in this.propertiesId) {
            var propId = this.propertiesId[i];
            propId.print();
        }
        for (var i in this.properties) {
            var property = this.properties[i];
            property.print();
        }
        if (this.noDiscriminator)
            this.noDiscriminator.print();
    };
    NoResultMap.prototype.getChaveCombined = function (keyphrase, key) {
        var combinedkey = key;
        if (keyphrase) {
            chaveCombinada = keyphrase + separator + key;
        }
        return combinedkey;
    };
    NoResultMap.prototype.getChave = function (record, keyphrase, prefix) {
        var key = this.getFullName() + separator;
        var pedacoBObject = '';
        for (var i in this.propertiesId) {
            var property = this.propertiesId[i];
            var value = record[property.getColumn(prefix)];
            if (value != null) {
                pedacoBObject += value;
            } else {
            }
        }
        if (pedacoBObject == '') {
            return null;
        }
        chave += pedacoBObject;
        return key;
    };
    NoResultMap.prototype.createObjects = function (templateManager, records) {
        var objects = [];
        var objectcache = {};
        var ancestorCache = {};
        for (var i in records) {
            var record = records[i];
            var keyobject = this.getChave(record, '');
            var objectknown = objectcache[keyobject] != null;
            var object = this.createObject(templateManager, objectcache, ancestorCache, record, '');
            if (!objectknown && object) {
                objects.push(object);
            } else {
            }
        }
        return objects;
    };
    NoResultMap.prototype.createObject = function (templateManager, objectcache, ancestorCache, record, keyphrase, prefix) {
        var keyobject = this.getChave(record, keyphrase, prefix);
        var combinedkey = this.getChaveCombined(keyphrase, keyobject);
        if (ancestorCache[keyobject] != null) {
            return ancestorCache[keyobject];
        }
        if (objectcache[combinedkey] != null) {
            var instance = objectcache[combinedkey];
            ancestorCache[keyobject] = instance;
            this.processCollections(templateManager, objectcache, ancestorCache, instance, record, combinedkey, prefix);
            delete ancestorCache[keyobject];
        } else {
            var Firstname = this.getNameModel(record, prefix), idChave = keyobject && keyobject.split(separator)[1];
            var model = templateManager.getModel(Firstname);
            model = model[Firstname];
            if (model == null) {
                throw new Error('Classe ' + Firstname + '.' + Firstname + ' não encontrada');
            }
            var instance = Object.create(model.prototype);
            instance.constructor.apply(instance, []);
            var foundValues = false;
            if (keyobject)
                ancestorCache[keyobject] = instance;
            foundValues = this.atribuaPropriedadesSimples(instance, record, prefix);
            if (keyobject != null) {
                foundValues = this.processCollections(templateManager, objectcache, ancestorCache, instance, record, combinedkey, prefix) || foundValues;
            }
            delete ancestorCache[keyobject];
            if (!foundValues || idChave && instance.id && idChave != instance.id.toString())
                return null;
            if (combinedkey && foundValues && instance.id != null && combinedkey.indexOf('null') < 0)
                objectcache[combinedkey] = instance;
        }
        return instance;
    };
    NoResultMap.prototype.getNameModel = function (record, prefix) {
        var typenot;
        if (!this.noDiscriminator) {
            tipoNo = this.type;
        } else {
            var valuetype = record[this.noDiscriminator.getColumn(prefix)];
            for (var i in this.noDiscriminator.cases) {
                if (this.noDiscriminator.cases[i].value == valuetype)
                    tipoNo = this.noDiscriminator.cases[i].type;
            }
            if (!typenot)
                tipoNo = this.type;
        }
        return typenot.substring(typenot.lastIndexOf('.') + 1);
    };
    NoResultMap.prototype.processCollections = function (templateManager, objectcache, ancestorCache, instance, record, keyobject, prefix) {
        var foundValue = false;
        for (var i = 0; i < this.properties.length; i++) {
            var property = this.properties[i];
            if (property instanceof NoPropriacaoColecao == false && property instanceof Noaffiliation == false) {
                continue;
            }
            var object = property.createObject(templateManager, objectcache, ancestorCache, instance, record, keyobject, prefix);
            foundValue = foundValue || object != null;
        }
        return foundValue;
    };
    NoResultMap.prototype.atribuaPropriedadesSimples = function (instance, record, prefix) {
        var foundValues = false;
        for (var j in this.propertiesId) {
            var propId = this.propertiesId[j];
            var value = record[propId.getColumn(prefix)];
            if (value instanceof Buffer) {
                if (value.length == 1) {
                    if (value[0] == 0) {
                        value = false;
                    } else {
                        value = true;
                    }
                }
            }
            instance[propId.name] = value;
            if (value)
                foundValues = true;
        }
        for (var j in this.properties) {
            var property = this.properties[j];
            if (property instanceof NoPropriacaoColecao) {
                continue;
            } else if (property instanceof Noaffiliation) {
                continue;
            }
            var value = record[property.getColumn(prefix)];
            if (value instanceof Buffer) {
                if (value.length == 1) {
                    if (value[0] == 0) {
                        value = false;
                    } else {
                        value = true;
                    }
                }
            }
            instance[property.name] = value;
            if (value)
                foundValues = true;
        }
        return foundValues;
    };
    return NoResultMap;
}(Atthe);
exports.NoResultMap = NoResultMap;
var NoDiscriminator = function () {
    function NoDiscriminator(javatype, column) {
        this.javatype = javatype;
        this.column = column;
        this.cases = [];
    }
    NoDiscriminator.prototype.add = function (noCaseDiscriminator) {
        this.cases.push(noCaseDiscriminator);
    };
    NoDiscriminator.prototype.print = function () {
        console.log('discriminator(' + this.javatype + ' ' + this.column + ')');
        for (var i in this.cases) {
            var nochase = this.cases[i];
            nochase.print();
        }
    };
    NoDiscriminator.prototype.getColumn = function (prefix) {
        return prefix ? prefix + this.column : this.column;
    };
    return NoDiscriminator;
}();
exports.NoDiscriminator = NoDiscriminator;
var NoCaseDiscriminator = function () {
    function NoCaseDiscriminator(value, type) {
        this.value = value;
        this.type = type;
    }
    NoCaseDiscriminator.prototype.print = function () {
        console.log('\tcase(' + this.value + ' ' + this.type + ')');
    };
    return NoCaseDiscriminator;
}();
exports.NoCaseDiscriminator = NoCaseDiscriminator;
var Main = function () {
    function Main() {
    }
    Main.prototype.leiaNoDiscriminator = function (noXml, noResultMap) {
        var noDiscriminator = new NoDiscriminator(noXml.getAttributeNode('javaType').value, noXml.getAttributeNode('column').value);
        for (var i = 0; i < noXml.childNodes.length; i++) {
            var atthe = noXml.childNodes[i];
            if (atthe.nodeName == 'case') {
                var value = atthe.getAttributeNode('value').value;
                var type = atthe.getAttributeNode('resultType').value;
                var nochase = new NoCaseDiscriminator(value, type);
                noDiscriminator.add(nochase);
            }
        }
        return noDiscriminator;
    };
    Main.prototype.leiaAssociationProperty = function (atthe, noResultMap) {
        var columnattribute = atthe.getAttributeNode('column');
        var valueColumn = '';
        if (columnattribute)
            valorColuna = columnattribute.value;
        var resultMap = atthe.getAttributeNode('resultMap').value;
        if (resultMap.indexOf('.') == -1) {
            resultMap = noResultMap.mapeamento.name + '.' + resultMap;
        }
        var columnPrefix = null;
        if (atthe.getAttributeNode('columnPrefix'))
            columnPrefix = atthe.getAttributeNode('columnPrefix').value;
        noResultMap.add(new Noaffiliation(atthe.getAttributeNode('property').value, valueColumn, columnPrefix, resultMap));
    };
    Main.prototype.readCollectionProperty = function (atthe, noResultMap) {
        var valueResultMap = '';
        if (atthe.getAttributeNode('resultMap')) {
            valorResultMap = atthe.getAttributeNode('resultMap').value;
        }
        var valueOfType = '';
        if (atthe.getAttributeNode('ofType')) {
            valorOfType = atthe.getAttributeNode('ofType').value;
        }
        var valueColumn = '';
        if (atthe.getAttributeNode('column'))
            valorColuna = atthe.getAttributeNode('column').value;
        var valuetypeJava = '';
        if (atthe.getAttributeNode('javaType'))
            valorTipoJava = atthe.getAttributeNode('javaType').value;
        var columnPrefix = null;
        if (atthe.getAttributeNode('columnPrefix'))
            columnPrefix = atthe.getAttributeNode('columnPrefix').value;
        noResultMap.add(new NoPropriacaoColecao(atthe.getAttributeNode('property').value, valueColumn, columnPrefix, valueResultMap, valueOfType, valuetypeJava));
    };
    Main.prototype.readResultProperty = function (atthe, noResultMap) {
        var type = '';
        noResultMap.add(new NoProperty(atthe.getAttributeNode('property').value, atthe.getAttributeNode('column').value));
    };
    Main.prototype.readResultMap = function (name, noXmlResultMap, mapping) {
        var name = noXmlResultMap.getAttributeNode('id').value;
        var type = noXmlResultMap.getAttributeNode('type').value;
        var noResultMap = new NoResultMap(name, type, mapping);
        var ownsId = false;
        for (var i = 0; i < noXmlResultMap.childNodes.length; i++) {
            var atthe = noXmlResultMap.childNodes[i];
            if (atthe.nodeName == 'id') {
                var propertyId = new NoPropriedadeId(atthe.getAttributeNode('property').value, atthe.getAttributeNode('column').value);
                noResultMap.setIdProperty(propertyId);
                ownsId = true;
            } else if (atthe.nodeName == 'result') {
                this.readResultProperty(atthe, noResultMap);
            } else if (atthe.nodeName == 'association') {
                this.leiaAssociationProperty(atthe, noResultMap);
            } else if (atthe.nodeName == 'collection') {
                this.readCollectionProperty(atthe, noResultMap);
            } else if (atthe.nodeName == 'discriminator') {
                var noDiscriminator = this.leiaNoDiscriminator(atthe, noResultMap);
                noResultMap.defineDiscriminator(noDiscriminator);
            }
        }
        if (!ownsId) {
            noResultMap.findPropertyId();
        }
        return noResultMap;
    };
    Main.prototype.read = function (name, gchild, mapping) {
        if (gchild.nodeName == 'resultMap') {
            return this.readResultMap(name, gchild, mapping);
        }
        var name = gchild.getAttributeNode('id').value;
        var incharge;
        if (gchild.nodeName == 'select') {
            var noResultMap = gchild.getAttributeNode('resultMap');
            var valueResultMap = '';
            if (noResultMap)
                valorResultMap = noResultMap.value;
            var noJavaType = gchild.getAttributeNode('resultType');
            var valueJavaType = '';
            if (noJavaType)
                valueJavaType = noJavaType.value;
            incharge = new NoSelect(name, valueResultMap, valueJavaType, mapping);
        } else {
            incharge = new Atthe(name, mapping);
        }
        for (var i = 0; i < gchild.childNodes.length; i++) {
            var atthe = gchild.childNodes[i];
            if (atthe.nodeName == 'choose') {
                this.readChoose('choose', atthe, incharge, mapping);
            } else if (atthe.nodeName == 'if') {
                this.readit('choose', atthe, incharge, mapping);
            } else if (atthe.nodeName == 'foreach') {
                this.readForEach('foreach', atthe, incharge, mapping);
            } else {
                if (atthe.hasChildNodes() == false) {
                    var noString = new NoString(atthe.textContent, mapping);
                    incharge.add(noString);
                }
            }
        }
        return incharge;
    };
    Main.prototype.readForEach = function (name, atthe, nomain, mapping) {
        var valueSeparador = '';
        if (atthe.getAttributeNode('separator')) {
            valueSeparador = atthe.getAttributeNode('separator').value;
        }
        var valueAverage = '';
        if (atthe.getAttributeNode('open')) {
            valueAverage = atthe.getAttributeNode('open').value;
        }
        var closingvalue = '';
        if (atthe.getAttributeNode('close')) {
            closingvalue = atthe.getAttributeNode('close').value;
        }
        var valueIndex = '';
        if (atthe.getAttributeNode('index')) {
            valueIndex = atthe.getAttributeNode('index').value;
        }
        var valueCollection = '';
        if (atthe.getAttributeNode('collection')) {
            valueCollection = atthe.getAttributeNode('collection').value;
        }
        var noday = new NoForEach(atthe.getAttributeNode('item').value, valueIndex, valueSeparador, valueAverage, closingvalue, atthe.textContent, valueCollection, mapping);
        nomain.add(noday);
    };
    Main.prototype.readit = function (name, atthe, nomain, mapping) {
        var noIf = new NoIf(atthe.getAttributeNode('test').value, atthe.childNodes[0].toString(), mapping);
        for (var i = 0; i < atthe.childNodes.length; i++) {
            var noson = atthe.childNodes[i];
            if (noson.nodeName == 'choose') {
                this.readChoose('choose', noson, noIf, mapping);
            } else if (noson.nodeName == 'if') {
                this.readit('choose', noson, noIf, mapping);
            } else if (noson.nodeName == 'foreach') {
                this.readForEach('foreach', noson, noIf, mapping);
            } else {
                if (noson.hasChildNodes() == false) {
                    var noString = new NoString(noson.textContent, mapping);
                    noIf.add(noString);
                }
            }
        }
        nomain.add(noIf);
    };
    Main.prototype.readChoose = function (name, atthe, nomain, mapping) {
        var nohead = new NoChoose(mapping);
        for (var i = 0; i < atthe.childNodes.length; i++) {
            var children = atthe.childNodes;
            var noson = children[i];
            if (noson.nodeName == 'when') {
                nohead.add(this.readNoWhen('when', noson, atthe, mapping));
            } else if (noson.nodeName == 'otherwise') {
                nohead.add(new NoOtherwise(noson.childNodes[0].toString(), mapping));
            }
        }
        nomain.add(nohead);
    };
    Main.prototype.readNoWhen = function (name, atthe, noPrivate, mapping) {
        var expressionTest = atthe.getAttributeNode('test').value;
        var nowhen = new Nowhen(expressionTest, '', mapping);
        for (var i = 0; i < atthe.childNodes.length; i++) {
            var noson = atthe.childNodes[i];
            if (noson.nodeName == 'choose') {
                this.readChoose('choose', noson, nowhen, mapping);
            } else if (noson.nodeName == 'if') {
                this.readit('choose', noson, nowhen, mapping);
            } else if (noson.nodeName == 'foreach') {
                this.readForEach('foreach', noson, nowhen, mapping);
            } else {
                if (noson.hasChildNodes() == false) {
                    var noString = new NoString(noson.textContent, mapping);
                    nowhen.add(noString);
                }
            }
        }
        return nowhen;
    };
    Main.prototype.process = function (dir_xml) {
        var mapNos = {};
        var templateManager = new TemplateMapManager();
        var models = {};
        var walk = function (dir, done) {
            var results = [];
            var list = fs.readdirSync(dir);
            var pending = list.length;
            if (!pending)
                return done(null, results);
            list.forEach(function (filet) {
                var filet = dir + '/' + filet;
                var stat = fs.statSync(filet);
                if (stat && stat.isDirectory() && filet.indexOf('.svn') == -1) {
                    walk(filet, function (err, res) {
                        results = results.concat(res);
                        if (!--pending)
                            done(null, results);
                    });
                } else {
                    results.push(filet);
                    if (!--pending)
                        done(null, results);
                }
            });
        };
        var ext = global.domainExt || '.js', directoryDomain = global.domainDir || './domain';
        walk(directoryDomain, function (err, files) {
            for (var i in files) {
                var archive = files[i];
                if (archive.indexOf(ext) == -1)
                    continue;
                var filename = path.basename(archive);
                var nameClassDomain = filename.replace(ext, '');
                var PATHfile = path.join(path.resolve('.'), archive);
                if (!fs.existsSync(PATHfile))
                    throw new Error('Arquivo não encontrado:' + PATHfile);
                var model = require(path.join(path.resolve('.'), archive));
                templateManager.addModel(nameClassDomain, model);
            }
        });
        var files = fs.readdirSync(dir_xml);
        for (var i in files) {
            var archive = files[i];
            var mapping = this.processFile(dir_xml + archive);
            templateManager.add(mapping);
        }
        return templateManager;
    };
    Main.prototype.processFile = function (filename) {
        if (fs.lstatSync(filename).isDirectory())
            return null;
        var xml = fs.readFileSync(filename).toString();
        var xmlDoc = new DOMParser().parseFromString(xml);
        if (xmlDoc.documentElement.nodeName != 'mapper') {
            return null;
        }
        var we = xmlDoc.documentElement.childNodes;
        var mapping = new Mapping(xmlDoc.documentElement.getAttributeNode('namespace').value);
        for (var i = 0; i < we.length; i++) {
            var noXml = we[i];
            if (noXml.nodeName != '#text' && noXml.nodeName != '#comment') {
                var atthe = this.read(noXml.nodeName, noXml, mapping);
                mapping.add(atthe);
            }
        }
        return mapping;
    };
    return Main;
}();
exports.Main = Main;
var TemplateMapManager = function () {
    function TemplateMapManager() {
        this.mappings = [];
        this.mapMapping = {};
        this.models = {};
    }
    TemplateMapManager.prototype.getModel = function (name) {
        return this.models[name];
    };
    TemplateMapManager.prototype.addModel = function (nameClassDomain, classe) {
        if (this.models[nameClassDomain] != null)
            return;
        this.models[nameClassDomain] = classe;
    };
    TemplateMapManager.prototype.add = function (mapping) {
        if (mapping == null)
            return;
        this.mapMapping[mapping.name] = mapping;
        this.mappings.push(mapping);
    };
    TemplateMapManager.prototype.getResultMap = function (fullnameResultMap) {
        var nameNamespace = fullnameResultMap.split('.')[0];
        var nameResultMap = fullnameResultMap.split('.')[1];
        var mapping = this.mapMapping[nameNamespace];
        if (mapping == null) {
            throw new Error('Mapping ' + nameNamespace + ' não encontrado');
        }
        var resultMap = mapping.getResultMap(nameResultMap);
        return resultMap;
    };
    TemplateMapManager.prototype.getNo = function (fullnameResultMap) {
        var nameNamespace = fullnameResultMap.split('.')[0];
        var idon = fullnameResultMap.split('.')[1];
        var mapping = this.mapMapping[nameNamespace];
        return mapping.getNo(idon);
    };
    TemplateMapManager.prototype.insert = function (fullname, object, callback) {
        var me = this;
        var atthe = this.getNo(fullname);
        var sqlcommand = new SqlCommand();
        atthe.getSql(sqlcommand, object);
        var domain = require('domain').active;
        this.connection(function (connection) {
            connection.query(sqlcommand.sql, sqlcommand.parameters, domain.intercept(function (rows, fields, err) {
                if (rows.insertId) {
                    object.id = rows.insertId;
                }
                if (callback) {
                    callback();
                }
            }));
        });
    };
    TemplateMapManager.prototype.update = function (fullname, object, callback) {
        var me = this;
        var atthe = this.getNo(fullname);
        var sqlcommand = new SqlCommand();
        var sql = atthe.getSql(sqlcommand, object);
        var domain = require('domain').active;
        this.connection(function (connection) {
            connection.query(sqlcommand.sql, sqlcommand.parameters, domain.intercept(function (rows, fields, err) {
                if (err)
                    throw err;
                if (callback) {
                    callback(rows.affectedRows);
                }
            }));
        });
    };
    TemplateMapManager.prototype.remove = function (fullname, object, callback) {
        var me = this;
        var atthe = this.getNo(fullname);
        var sqlcommand = new SqlCommand();
        var sql = atthe.getSql(sqlcommand, object);
        var domain = require('domain').active;
        this.connection(function (connection) {
            connection.query(sqlcommand.sql, sqlcommand.parameters, domain.intercept(function (rows, fields, err) {
                if (err)
                    throw err;
                if (callback) {
                    callback(rows.affectedRows);
                }
            }));
        });
    };
    TemplateMapManager.prototype.selectOne = function (fullname, data, callback) {
        this.selectList(fullname, data, function (objects) {
            if (objects.length == 1)
                callback(objects[0]);
            callback(null);
        });
    };
    TemplateMapManager.prototype.selectList = function (fullname, data, callback) {
        var me = this;
        var atthe = this.getNo(fullname);
        var sqlcommand = new SqlCommand();
        atthe.getSql(sqlcommand, data);
        var domain = require('domain').active;
        this.connection(function (connection) {
            connection.query(sqlcommand.sql, sqlcommand.parameters, domain.intercept(function (rows, fields, err) {
                if (err) {
                    console.log(err);
                    console.log(err.message);
                    throw err;
                }
                callback(rows);
            }));
        });
    };
    TemplateMapManager.prototype.create = function () {
        var instance = Object.create(TemplateMapManager);
        instance.constructor.apply(instance, []);
        return instance;
    };
    TemplateMapManager.prototype.context = function () {
        var domain = require('domain').active;
        return domain.context;
    };
    TemplateMapManager.prototype.connection = function (callback) {
        return this.context().getConnected(callback);
    };
    TemplateMapManager.prototype.transaction = function (callback) {
        return this.context().initiationTranslation(callback);
    };
    return TemplateMapManager;
}();
exports.TemplateMapManager = TemplateMapManager;
var Mapping = function () {
    function Mapping(name) {
        this.name = name;
        this.filhos = [];
        this.resultMaps = [];
        this.resultsMapsPorId = {};
        this.nosPorId = {};
    }
    Mapping.prototype.add = function (noson) {
        noson.mapeamento = this;
        this.filhos.push(noson);
        if (noson instanceof NoResultMap) {
            this.resultMaps.push(noson);
            this.resultsMapsPorId[noson.id] = noson;
        }
        this.nosPorId[noson.id] = noson;
    };
    Mapping.prototype.getResultMap = function (nameResultMap) {
        return this.resultsMapsPorId[nameResultMap];
    };
    Mapping.prototype.getNo = function (idon) {
        return this.nosPorId[idon];
    };
    return Mapping;
}();
exports.dir_xml = dir_xml;
exports.Mapping = Mapping;
exports.Context = Context;