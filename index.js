"use strict";

function select(query, data) {
    // Get data source table (FROM)
    let fromIdx = query.toUpperCase().indexOf('FROM', 6);
    if (fromIdx < 0 ) throw new Error('invalid SQL syntax. No FROM found');
    const table = query.substring(fromIdx + 4, query.indexOf(' ', fromIdx + 5)).trim();
    
    // Get fields we are selecting
    let selectIdx = query.toUpperCase().indexOf('SELECT');
    if (selectIdx < 0 ) throw new Error('invalid SQL syntax. No SELECT found');
    let fieldsRgx = /(\s([\w*]+[,\s]+)+)(?=FROM)/gi;
    const fields = query.match(fieldsRgx)[0].split(',').map(f=>f.trim());
    if (fields.includes('*')) fields.push(...Object.keys(data[table][0])); 

    // Get any conditions
    let re = /(\s\w+\s)(?:<>)(\s[\w\d]+)|(\s\w+\s)(?:<=)(\s[\w\d]+)|(?:>=)(\s[\w\d]+)|(\s\w+\s)[=><](\s[\w\d]+)|(\s\w+\s)like(\s[\w"%]+)|(\s\w+\s)in(\s\(.+\))|(\s\w+\s)(between)(\s[\w\d]+){3}/gi;
    const conditions = query.match(re).map(c=>c.trim());

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
    conditions.forEach(c => {
        filters.push(getCondition(c));
    });

    // Do the filtering and return result
    return filterAndMapData(data[table], fields, filters);
}



/**
 * Takes in a condition string and returns the elements
 * e.g. a = b returns {field: a, value1: b, condition: '='}
 * value2 used for between operator
 * Valid operands are =, <>, >, <, like, in, between
 * @param {string} conditionString e.g. a = b
 */
function getCondition(conditionString) {
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
    return { field: elements[0], comparison: elements[1], value1: !isNaN(+elements[2]) ? elements[2] : +elements[2] };
}

/**
 * Filters for each condition and maps for selected fields
 * @param {[{*}]} data 
 * @param {*} fields 
 * @param {*} filters 
 */
function filterAndMapData(data, fields, filters) {
    return data.reduce((acc, row) => {
        let pass = 1;
        filters.forEach(f => {
            switch (f.comparison.toLowerCase()) {
                case '=':
                    pass *= +(row[f.field] === f.value1);
                    break;
                case '<>':
                    pass *= +(row[f.field] !== f.value1);
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
                    let re = new RegExp(`${f.value1.charAt(0) === '%' ? '' : '^'}${term}${f.value1.charAt(f.value1.length - 1) === '%' ? '' : '$'}`)
                    pass *= +(row[f.field].match(re) !== null);
                    break;
                case 'in':
                    pass *= +(f.value1.replace(/[\(\)]/g, '').split(/\s*,\s*/).includes(row[f.field].toString()));
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



//##############################################################################3
let data = [
    { a: 5, b: 1, c: 'fart' },
    { a: 4, b: 2, c: 'poo' },
    { a: 3, b: 3, c: 'bum' },
]


let q = 'SELECT * FROM data WHERE a IN (2,3,4) AND b BETWEEN 1 AND 3 AND c LIKE "%oo"'
let result = select(q, { data: data });
console.log(q);
console.log(result);