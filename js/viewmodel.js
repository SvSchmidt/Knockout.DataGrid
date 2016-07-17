ko.components.register('data-grid', {
    template: `
    <style type="text/css" data-bind="text: style"></style>
    <data-grid-header data-bind="attr: { id: identifier + '-header' }">
        <row data-bind="foreach: columns">
            <cell data-bind="text: title, click: isSortColumn.bind($data, true), css: { 'sort-column': isSortColumn, 'sort-descending': isSortColumn() && $parent.sortDescending() }"></cell>
        </row>
    </data-grid-header>
    <!-- ko if: data().length === 0 -->
    <data-grid-body data-bind="attr: { id: identifier + '-body' }"
                    class="no-items-placeholder">
        <row>
            <cell>There aren't any items to display.</cell>
        </row>
    </data-grid-body>
    <!-- /ko -->
    <!-- ko if: data().length > 0 -->
    <data-grid-body data-bind="attr: { id: identifier + '-body' }">
        <!-- ko virtualForEach: { data: data, template: $componentTemplateNodes, childHeight: 24, virtualChildSelector: 'row' } --><!-- /ko -->
    </data-grid-body>
    <!-- /ko -->
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
        // Todo: Must use a computed / subscriptions to update properly (e.g. number of columns change)
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
                style += `#${this.identifier}-body cell:nth-of-type(${i + 1}){min-width:${w};max-width:${w}} #${this.identifier}-header cell:nth-of-type(${i + 1}){min-width:${w}!important;max-width:${w}!important}`;
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

numberOfItems = ko.observable().extend({ rateLimit: { timeout: 800, method: "notifyWhenChangesStop" } });;
testData = ko.observableArray([]);

numberOfItems.subscribe(n => {
    let result = [];
    for (let i = 0; i < n; i++) {
        result.push({
            name: chance.first(),
            surname: chance.last(),
            birthday: chance.birthday({ string: true }),
            gender: chance.gender(),
            phone: chance.phone(),
            plz: chance.zip(),
        });
    }

    testData(result);
});
numberOfItems(1e4);

ko.applyBindings({
    test: testData,
});
