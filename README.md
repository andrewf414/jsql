# jSQL
This is a small utility to enable using SQL style queries on JavaScript arrays of objects. 
Essentially it boils down to doing a reduce and a sort, but it means you don't have to set them up each time and think about it.

### Install
```
$ npm i @fitzy/jsql
```

### Usage
```
import  *  as  jsql  from  '@fitzy/jsql';

jsql.select('SELECT * FROM myData', { myData: [{a: 1, b: 'foo'}, {a: 4, b: 'bar'}, ...], relatedData: [] });
```

The data is passed in as an array to:
a) allow putting the key in the select statement, and
b) allow me to expand this to have joins later

### Supported Syntax
* SELECT
* FROM
* WHERE (=, <=, >=, <, >, <>, like, in, between)
* ORDER BY
* Aliasing (i.e. select field AS othername)

### Working on
* Dates

### Yet to Implement
* GROUP BY
* HAVING
* Aggregate functions (avg, count, etc)
* JOINs