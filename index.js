"use strict";

function select(query, data) {
    let selectIdx = query.toUpperCase().indexOf('SELECT');
    let fromIdx = query.toUpperCase().indexOf('FROM');
    let whereIdx = query.toUpperCase().indexOf('WHERE');
    let orderIdx = query.toUpperCase().indexOf('ORDER BY');

    const fields = query.substring(selectIdx + 6, fromIdx).split(',').map(field => field.trim());
    const table = query.substring(fromIdx + 4, query.indexOf(' ', fromIdx + 5)).trim();
    const conditions = query.substring(whereIdx + 5, orderIdx === -1 ? query.length : orderIdx).split(' AND ').map(field => field.trim());
    // const order = orderIdx === -1 ? 'ASC' : query.substring(orderIdx + 8, query.length).trim();

    // console.log(fields);
    // console.log(table);
    // console.log(conditions);
    // console.log(order)

    let filters = [];
    conditions.forEach(c => {
        filters.push(getCondition(c));
    })
    // console.log(filters)


    // Do the filtering and return result
    return filterAndMapData(data[table], fields, filters);
}



/**
 * Takes in a condition string and returns the elements
 * e.g. a = b returns {field1: a, field2: b, condition: '='}
 * Valid operands are =, <>, >, <
 * @param {string} conditionString e.g. a = b
 */
function getCondition(conditionString) {
    const conditionOperators = /(?:<>)|(?:<=)|(?:>=)|[=><]/g

    const tmp = conditionString.split(conditionOperators);
    const field = tmp[0].trim();
    let value = tmp[1].trim().replace(/["']/g, '');
    if (!isNaN(+value)) value = +value;
    const comparison = conditionString.match(conditionOperators)[0].trim();

    return { field: field, value: value, comparison: comparison };
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
            switch (f.comparison) {
                case '=':
                    pass *= +(row[f.field] === f.value);
                    break;
                case '<>':
                    pass *= +(row[f.field] !== f.value);
                    break;
                case '>':
                    pass *= +(row[f.field] > f.value);
                    break;
                case '<':
                    pass *= +(row[f.field] < f.value);
                    break;
                case '<=':
                    pass *= +(row[f.field] <= f.value);
                    break;
                case '>=':
                    pass *= +(row[f.field] >= f.value);
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


let q = 'SELECT a, c FROM data WHERE a > 3 AND b = 2'
let result = select(q, { data: data });
console.log(result);