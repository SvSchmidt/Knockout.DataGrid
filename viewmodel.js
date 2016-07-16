ko.components.register('data-grid', {
    template: `
    <style type="text/css" data-bind="text: style"></style>
    <data-grid-header>
        <row data-bind="foreach: columns">
            <cell data-bind="text: title, click: isSortColumn.bind($data, true), css: { 'sort-column': isSortColumn, 'sort-descending': isSortColumn() && $parent.sortDescending() }"></cell>
        </row>
    </data-grid-header>
    <data-grid-body>
        <!-- ko virtualForEach: { data: data, template: $componentTemplateNodes, childHeight: 24, virtualChildSelector: 'row' } --><!-- /ko -->
    </data-grid-body>
    <data-grid-footer>
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

        let style = '';
        width.each((w, i) => {
            if (w !== 'auto') {
                style += `cell:nth-of-type(${i + 1}) { min-width: ${w}!important; max-width: ${w}!important; }`;
            }
        });
        this.style = style;

        this.data = ko.pureComputed(() => {
            const data = ko.utils.unwrapObservable(this._data);

            if (this.sortColumn()) {
                return data.sortBy(x => x[this.sortColumn()], this.sortDescending());
            } else {
                return data;
            }
        }).extend({ rateLimit: { timeout: 500, method: "notifyWhenChangesStop" } });

        window.setTimeout(() => {
            // set right padding of the grid-header/grid-footer to the difference between the width and the scroll width of the body (= width of scrollbar)
            const gridBody = $('data-grid-body');
            const scrollbarWidth = (gridBody.width() - gridBody[0].scrollWidth) + 'px';
            $('data-grid-header').css('paddingRight',  scrollbarWidth);
            $('data-grid-footer').css('paddingRight',  scrollbarWidth);
        }, 200);

        /*window.setTimeout(() => {
            const slice = Array.prototype.slice.call.bind(Array.prototype.slice);
            const headerCells = slice(document.querySelectorAll('data-grid-header cell'));
            const cells = slice(document.querySelectorAll('data-grid-body row:first-of-type>cell'));
            const row = document.querySelector('data-grid-body row:nth-of-type(1n)');
            const rowWidth = parseFloat(window.getComputedStyle(row)['width']);

            cells.each((c, i) => {
                const width = parseFloat(window.getComputedStyle(c)['width']);
                headerCells[i].style['minWidth'] = window.getComputedStyle(c)['minWidth'];
            })
        });*/
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
sortFn = ko.observable();
result = ko.computed(() => testData().sortBy(sortFn()));

sortFn.subscribe(() => {
    performance.clearMarks();
    performance.clearMeasures('sort');
    performance.mark('sortStart');
}, null, "beforeChange");

sortFn.subscribe(() => {
    performance.mark('sortEnd');
    performance.measure('sort', 'sortStart', 'sortEnd');
    console.log('sorting took: ', performance.getEntriesByName('sort')[0].duration);
});

sort = (arg) => {
    sortFn.valueWillMutate();
    sortFn(arg);
}

ko.applyBindings({
    test: result,
});
