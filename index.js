"use strict";

class Jsql {

    static select(query, data) {
        const table = query.match(/\sfrom\s+(\w)+($|\s)/gi)[0].trim().split(/\s/)[1];

        // Get fields we are selecting
        let selectIdx = query.toUpperCase().indexOf('SELECT');
        if (selectIdx < 0) throw new Error('invalid SQL syntax. No SELECT found');
        let fieldsRgx = /(\s([\w*]+[,\s]+)+)(?=FROM)/gi;
        const fields = query.match(fieldsRgx)[0].split(',').map(f => f.trim());
        if (fields.includes('*')) fields.push(...Object.keys(data[table][0]));

        // Get any conditions
        let re = /(\s\w+\s)(?:<>)(\s[\w\d"']+)|(\s\w+\s)(?:<=)(\s[\w\d"']+)|(?:>=)(\s[\w\d"']+)|(\s\w+\s)[=><](\s[\w\d"']+)|(\s\w+\s)like(\s[\w"'%]+)|(\s\w+\s)in(\s\(.+\))|(\s\w+\s)(between)(\s[\w\d]+){3}/gi;
        const conditionsMatch = query.match(re);
        let conditions = conditionsMatch === null ? null : conditionsMatch.map(c => c.trim().replace(/'|"/g, ''));

        // Get order
        let orderRgx = query.match(/ORDER BY\s\w+\s?(ASC|DESC)?/i);
        let order = {};
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

        let filters = [];
        if (conditions !== null) {
            conditions.forEach(c => {
                filters.push(this.getCondition(c));
            });
        }

        // Do the filtering and return result
        return this.sort(this.filterAndMapData(data[table], fields, filters), order.field, order.direction === 'ASC');
    }



    /**
     * Takes in a condition string and returns the elements
     * e.g. a = b returns {field: a, value1: b, condition: '='}
     * value2 used for between operator
     * Valid operands are =, <>, >, <, like, in, between
     * @param {string} conditionString e.g. a = b
     */
    static getCondition(conditionString) {
        let elements = conditionString.split(/\s+/);

        if (elements[1].toLowerCase() === 'between') {
            // need to get two values
            return { field: elements[0], comparison: elements[1], value1: !isNaN(+elements[2]) ? elements[2] : +elements[2], value2: !isNaN(+elements[4]) ? elements[4] : +elements[4] };
        }
        if (elements[1].toLowerCase() === 'in') {
            // get the list
            return { field: elements[0], comparison: elements[1], value1: conditionString.match(/\([\d\w,\s]+\)/)[0] };
        }
        if (elements[1].toLowerCase() === 'like') {
            // get the expression
            return { field: elements[0], comparison: elements[1], value1: elements[2].replace(/["']/g, '') };
        }
        return { field: elements[0], comparison: elements[1], value1: isNaN(+elements[2]) ? elements[2] : +elements[2] };
    }

    /**
     * Filters for each condition and maps for selected fields
     * @param {[{*}]} data 
     * @param {*} fields 
     * @param {*} filters 
     */
    static filterAndMapData(data, fields, filters) {
        return data.reduce((acc, row) => {
            let pass = 1;
            filters.forEach(f => {
                switch (f.comparison.toLowerCase()) {
                    case '=':
                        pass *= +(row[f.field].toLowerCase() === f.value1.toLowerCase());
                        break;
                    case '<>':
                        pass *= +(row[f.field].toLowerCase() !== f.value1.toLowerCase());
                        break;
                    case '>':
                        pass *= +(row[f.field] > f.value1);
                        break;
                    case '<':
                        pass *= +(row[f.field] < f.value1);
                        break;
                    case '<=':
                        pass *= +(row[f.field] <= f.value1);
                        break;
                    case '>=':
                        pass *= +(row[f.field] >= f.value1);
                        break;
                    case 'like':
                        let term = f.value1.replace(/%/g, '.*');
                        let re = new RegExp(`${f.value1.charAt(0) === '%' ? '' : '^'}${term}${f.value1.charAt(f.value1.length - 1) === '%' ? '' : '$'}`, 'i')
                        pass *= +(row[f.field].match(re) !== null);
                        break;
                    case 'in':
                        pass *= +(f.value1.toLowerCase().replace(/[\(\)]/g, '').split(/\s*,\s*/).includes(row[f.field].toString().toLowerCase()));
                        break;
                    case 'between':
                        pass *= +(row[f.field] >= f.value1 && row[f.field] <= f.value2);
                        break;
                }
            });
            if (!!pass) {
                let mappedRow = {};
                Object.keys(row).forEach(key => {
                    if (fields.includes(key)) {
                        mappedRow[key] = row[key];
                    }
                });
                acc.push(mappedRow);
            }
            return acc;
        }, []);
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
