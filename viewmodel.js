ko.components.register('data-grid', {
    template: `
    <h3><!-- ko text: (data().length).format() --><!-- /ko --> items</h3>
    <style type="text/css" data-bind="text: style"></style>
    <data-grid-header data-bind="attr: { id: identifier + '-header' }">
        <row data-bind="foreach: columns">
            <cell data-bind="text: title, click: isSortColumn.bind($data, true), css: { 'sort-column': isSortColumn, 'sort-descending': isSortColumn() && $parent.sortDescending() }"></cell>
        </row>
    </data-grid-header>
    <data-grid-body data-bind="attr: { id: identifier + '-body' }">
        <!-- ko virtualForEach: { data: data, template: $componentTemplateNodes, childHeight: 24, virtualChildSelector: 'row' } --><!-- /ko -->
    </data-grid-body>
    <data-grid-footer style="display: none;">
        <row>
            <cell>Footer!</cell>
            <cell></cell>
            <cell></cell>
            <cell>
                Number of items: <!-- ko text: (ko.utils.unwrapObservable(data).length).format() --><!-- /ko -->
            </cell>
        </row>
    </data-grid-footer>
    `,
    viewModel: function (params) {
        let { data, headers, fields, width, sortBy, sortDescending } = params;

        this._data = data;
        this.identifier = `grid-${Math.floor(Math.random() * 100)}`;

        let columns = [];
        const numOfColumns = headers.length;

        if (!width) {
            width = headers.map(x => 'auto');
        } else if (width.length !== numOfColumns) {
            throw new Error('Number of width properties does not match number of columns!');
        }

        if (!fields) {
            fields = headers;
        } else if (fields.length !== numOfColumns) {
            throw new Error('Number of fields does not match number of columns!');
        }

        if (!~fields.indexOf(sortBy)) {
            throw new Error(`Can't sort by unknown column ${sortBy}!`);
        }

        this.sortColumn = ko.observable(sortBy);
        this.sortDescending = ko.observable(sortDescending);

        for (let i = 0; i < numOfColumns; i++) {
            const col = {
                title: headers[i],
                field: fields[i],
                width: width[i],
                isSortColumn: ko.computed({
                    read: () => fields[i] === this.sortColumn(),
                    write: b => {
                        if (col.isSortColumn()) {
                                this.sortDescending(!this.sortDescending());
                        } else if (b) {
                            this.sortColumn(fields[i]);
                        }
                    }
                })
            };

            columns.push(col);
        }

        this.columns = columns;

        // yes, we actually CAN just use a <style> element to set widths per css as we demand
        let style = '';
        width.each((w, i) => {
            if (w !== 'auto') {
                style += `#${this.identifier}-body cell:nth-of-type(${i + 1}){min-width:${w}!important;max-width:${w}!important} #${this.identifier}-header cell:nth-of-type(${i + 1}){min-width:${w}!important;max-width:${w}!important}`;
            }
        });
        this.style = style;

        // make data a computed to apply sorting etc.
        this.data = ko.pureComputed(() => {
            const data = ko.utils.unwrapObservable(this._data);

            if (this.sortColumn()) {
                return data.sortBy(x => x[this.sortColumn()], this.sortDescending());
            } else {
                return data;
            }
        }).extend({ rateLimit: { timeout: 100, method: "notifyWhenChangesStop" } });

        // set right/left padding of the grid-header/grid-footer to the difference between the width and the scroll width of the body
        // (= width of scrollbar)
        window.setTimeout(() => {
            const gridBody = $('data-grid-body');
            const scrollbarWidth = (gridBody.width() - gridBody[0].scrollWidth) + 'px';
            $('data-grid-header').css('paddingRight',  scrollbarWidth);
            $('data-grid-footer').css('paddingRight',  scrollbarWidth);
            $('data-grid-header').css('paddingLeft',  scrollbarWidth);
            $('data-grid-footer').css('paddingLeft',  scrollbarWidth);
        }, 200);
    }
});

let testData = [];
for (let i = 0; i < 10000; i++) {
    testData.push({
        name: chance.first(),
        surname: chance.last(),
        birthday: chance.birthday({ string: true }),
        gender: chance.gender(),
        phone: chance.phone(),
        plz: chance.zip(),
    });
}

while (testData.length < 1e4) {
    testData = [...testData, ...testData];
}

testData = ko.observableArray(testData);

ko.applyBindings({
    test: testData,
});
