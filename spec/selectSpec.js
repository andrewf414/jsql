describe("Select", function () {
    const jsql = require('../index')
    const data = require('../test-data.json')

    it("should select specified single field", function () {
        let res = jsql.select('select profile.lastName from oktaUsers', data);
        // res should be array of last names
        expect(res).toContain(jasmine.objectContaining({ lastName: "Fitzgerald"}));
        expect(res).toContain(jasmine.objectContaining({ lastName: "Wood"}));
    });

});
