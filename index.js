"use strict";

class Jsql {

    static select(query, data) {
        const table = this.getTable(query);
        const fields = this.getFields(query, data, table);
        const aliases = this.getAliases(query);
        const conditions = this.getConditions(query);
        const order = this.getOrder(query, fields);
        const filters = this.getFilters(conditions);

        // Do the filtering and return result
        return this.sort(this.filterAndMapData(data[table], fields, filters, aliases), order.field, order.direction === 'ASC');
    }





    /**
     * Returns null or an array of 'field as alias' strings
     * @param {string} query SQL style query
     */
    static getAliases(query) {
        let re = /[\w\.]+\s+as\s+\w+/gi;
        let res = query.match(re);
        return res === null ? null : res.map(c => c.trim().replace(/'|"/g, ''));
    }

    /**
     * Returns null or an array of condition strings
     * @param {string} query SQL style query
     */
    static getConditions(query) {
        let re = /(\s*[\w\.]+\s*)((<=)|(>=)|(<>)|[<>=])(\s*[\w\d"']+)|(\s*[\w\.]+\s*)like(\s[\w"'%]+)|(\s*[\w\.]+\s*)between(\s[\w\d]+){3}|(\s*[\w\.]+\s*)in(\s\(.+\))/gi
        const conditionsMatch = query.match(re);
        return conditionsMatch === null ? null : conditionsMatch.map(c => c.trim().replace(/'|"/g, ''));
    }

    /**
     * Returns null or an array of fields to select
     * @param {string} query SQL style query
     * @param {object of arrays of objects} data the data
     * @param {string} table name of the key in data for array of objects
     */
    static getFields(query, data, table) {
        let selectIdx = query.toUpperCase().indexOf('SELECT');
        if (selectIdx < 0) throw new Error('invalid SQL syntax. No SELECT found');

        let fieldsRgx = /(\s([\w\.*]+[,\s]+)+)(?=FROM)/gi;
        const fieldsMatch = query.match(fieldsRgx);
        if (fieldsMatch === null) return null;

        const fields = fieldsMatch[0].split(',').map(f => f.trim());
        if (fields.includes('*')) fields.push(...Object.keys(data[table][0]));

        return fields;
    }

    /**
     * Returns null or name of the table (i.e. key in the data)
     * @param {string} query 
     */
    static getTable(query) {
        let re = /\sfrom\s+(\w)+($|\s)/gi
        const tableMatch = query.match(re);
        return tableMatch === null ? null : tableMatch[0].trim().split(/\s/)[1];
    }

    /**
     * Returns order specified, or default of first field listed ASC
     * Format of return is {field: 'name', direction: 'ASC|DESC'}
     * @param {*} query 
     * @param {*} fields 
     */
    static getOrder(query, fields) {
        const orderRgx = query.match(/ORDER BY\s\w+\s?(ASC|DESC)?/i);
        const order = {};
        if (orderRgx === null) {
            // default
            let i = 0;
            while (fields[i] === '*') {
                i++;
            }
            order.field = fields[i];
            order.direction = 'ASC';
        } else {
            order.field = orderRgx[0].substring(orderRgx[0].lastIndexOf(' ')).trim();
            if (orderRgx[1] === undefined) order.direction = 'ASC'; else order.direction = orderRgx[1];
        }

        return order;
    }

    /**
     * Returns array of conditions to be applied
     * Format is {field: a, value1: b, condition: '='}
     * @param {*} conditions 
     */
    static getFilters(conditions) {
        const filters = [];
        if (conditions !== null) {
            conditions.forEach(c => {
                filters.push(this.mapCondition(c));
            });
        }
        return filters;
    }




    /**
     * Takes in a condition string and returns the elements
     * e.g. a = b returns {field: a, value1: b, condition: '='}
     * value2 used for between operator
     * Valid operands are =, <>, >, <, like, in, between
     * @param {string} conditionString e.g. a = b
     */
    static mapCondition(conditionString) {
        let elements = conditionString.split(/\s+/);

        if (elements[1].toLowerCase() === 'between') {
            // need to get two values
            return {
                field: elements[0],
                comparison: elements[1],
                value1: !isNaN(+elements[2]) ? elements[2] : +elements[2],
                value2: !isNaN(+elements[4]) ? elements[4] : +elements[4]
            };
        }
        if (elements[1].toLowerCase() === 'in') {
            // get the list
            return {
                field: elements[0],
                comparison: elements[1],
                value1: conditionString.match(/\([\d\w,\s]+\)/)[0].toLowerCase()
            };
        }
        if (elements[1].toLowerCase() === 'like') {
            // get the expression
            return {
                field: elements[0],
                comparison: elements[1],
                value1: elements[2].replace(/["']/g, '').toLowerCase()
            };
        }
        return {
            field: elements[0],
            comparison: elements[1],
            value1: isNaN(+elements[2]) ? elements[2].toLowerCase() : +elements[2]
        };
    }


    /**
     * Filter the data for any conditions and return the filtered data
     * @param {*} data 
     * @param {*} filters 
     */
    static filterData(data, filters) {
        return data.filter(row => {
            let pass = 1;
            let n = filters.length;
            for (let i = 0; i < n; i++) {
                // Handles any nested objects
                let keys = filters[i].field.split('.');
                let datum = row[keys[0]];
                if (keys.length > 1) {
                    for (let i = 1; i < keys.length; i++) {
                        datum = datum[keys[i]];
                    }
                }
                if (datum === undefined) continue;
                datum = isNaN(+datum) ? datum.toLowerCase() : +datum;

                switch (filters[i].comparison.toLowerCase()) {
                    case '=':
                        pass *= +(datum === filters[i].value1);
                        break;
                    case '<>':
                        pass *= +(datum !== filters[i].value1);
                        break;
                    case '>':
                        pass *= +(datum > filters[i].value1);
                        break;
                    case '<':
                        pass *= +(datum < filters[i].value1);
                        break;
                    case '<=':
                        pass *= +(datum <= filters[i].value1);
                        break;
                    case '>=':
                        pass *= +(datum >= filters[i].value1);
                        break;
                    case 'like':
                        let term = filters[i].value1.replace(/%/g, '.*');
                        let re = new RegExp(`${filters[i].value1.charAt(0) === '%' ? '' : '^'}${term}${filters[i].value1.charAt(filters[i].value1.length - 1) === '%' ? '' : '$'}`, 'i')
                        pass *= +(datum.match(re) !== null);
                        break;
                    case 'in':
                        pass *= +(filters[i].value1.replace(/[\(\)]/g, '').split(/\s*,\s*/).includes(datum));
                        break;
                    case 'between':
                        pass *= +(datum >= filters[i].value1 && row[filters[i].field] <= filters[i].value2);
                        break;
                }

                if (!!!pass) break;
            }

            return !!pass;
        });
    }

    /**
     * Return array of data mapped to selected fields and aliases
     * @param {*} data 
     * @param {*} fields 
     * @param {*} aliases 
     */
    static mapData(data, fields, aliases) {
        return data.map(row => {
            let mappedRow = {};
            fields.forEach(field => {
                let aliased = aliases.includes(field);
                let alias;
                if (aliased) {
                    const tmp = field.split(' ');
                    field = tmp[0];
                    alias = tmp[2].trim();
                }

                let split = field.split('.');
                if (row[split[0]] !== undefined) {
                    // gonna be included
                    let val = row[split[0]];
                    let key = split[0];
                    if (split.length > 1) {
                        // nested
                        for (let i = 1; i < split.length; i++) {
                            val = val[split[i]];
                            key = split[i];
                        }
                    }
                    if (aliased) key = alias;
                    mappedRow[key] = val;
                }
            });
            return mappedRow;
        });
    }

    /**
     * Filters for each condition and maps for selected fields
     * @param {[{*}]} data 
     * @param {*} fields 
     * @param {*} filters 
     */
    static filterAndMapData(data, fields, filters, aliases) {
        return this.mapData(this.filterData(data, filters), fields, aliases);
    }


    /**
     * Sorts an array of values or objects
     * @param {[<any>]} arr Array to be sorted
     * @param {*} key Key (if sorting an object) to sort by
     * @param {*} asc true is default, false to sort descending
     */
    static sort(arr, key, asc = true) {
        if (asc) {
            return arr.sort((a, b) => {
                if ((a[key] || a) > (b[key] || b)) {
                    return 1;
                } else {
                    return -1;
                }
            });
        } else {
            return arr.sort((a, b) => {
                if ((a[key] || a) > (b[key] || b)) {
                    return -1;
                } else {
                    return 1;
                }
            });
        }
    }
}

module.exports = Jsql;
