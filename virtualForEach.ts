interface IVirtualForEachBindingParams {
    data: KnockoutObservableArray<any> | any[];
    scrollContainerSelector: string;
    virtualChildSelector: string;
    childHeight?: number;
    template?: string | HTMLElement[];
}

declare var ko: any;
declare var KnockoutObservableArray: any;
declare var KnockoutBindingHandler: any;

type virtualForEachBindingValue = KnockoutObservableArray<any> | any[] | IVirtualForEachBindingParams;

class virtualForEachBinding implements KnockoutBindingHandler {
    static extractProperties(element: HTMLElement, valueAccessor: () => virtualForEachBindingValue) {
        if (Object.prototype.toString.call(element) !== '[object Comment]') {
            throw new TypeError(`[virtualForEach-binding error]: Binding only supported for knockout virtual elements, but was ${Object.prototype.toString.call(element)}`);
        }

        const value = <virtualForEachBindingValue>ko.utils.unwrapObservable(<any>valueAccessor());

        const isVirtualForEachBindingValue = function (v): v is IVirtualForEachBindingParams {
            return typeof v === 'object' &&
                !Array.isArray(v) &&
                v.hasOwnProperty('data');
        };

        let data, $scrollContainer: JQuery, virtualChildSelector: string, numberOfItems: number, childHeight: number, templateNameOrNodes: string | HTMLElement[];

        if (isVirtualForEachBindingValue(value)) {
            data = value.data;
            $scrollContainer = value.scrollContainerSelector && $(value.scrollContainerSelector);
            virtualChildSelector = value.virtualChildSelector;
            childHeight = value.childHeight;
            templateNameOrNodes = value.template;
        }

        data = data || value;
        $scrollContainer = $scrollContainer || $(element).parent();
        virtualChildSelector = virtualChildSelector || ':not(.virtual-white-space)';
        numberOfItems = ko.utils.unwrapObservable(data).length;

        return [data, $scrollContainer, virtualChildSelector, numberOfItems, childHeight, templateNameOrNodes];
    }

    static makeTemplateValueAccessor(data, template) {
        const templateValue = {
            foreach: data,
        };

        if (template && Array.isArray(template)) {
            templateValue['nodes'] = template;
        } else if (template) {
            templateValue['name'] = template;
        }

        return () => templateValue;
    }

    init(element: HTMLElement,
        valueAccessor: () => virtualForEachBindingValue,
        allBindingsAccessor: KnockoutAllBindingsAccessor,
        viewModel: any,
        bindingContext: KnockoutBindingContext)
    {
        const [data, $scrollContainer, virtualChildSelector, numberOfItems, ...rest] = virtualForEachBinding.extractProperties(element, valueAccessor);

        // we need an observable for the scrollY-value of the element
        // so save an observable in the elements data attribute
        if (!ko.isObservable($scrollContainer.data('scrollObs'))) {
            // only once!
            $scrollContainer.data('scrollObs', ko.observable($scrollContainer.scrollTop()));
        }

        // prepend / append virtual white space to the begin / end of the scroll container
        window.requestAnimationFrame(() => {
            $(element).parent().prepend($(`<div class="virtual-white-space no-shrink no-grow pre" style="height: 0px; visibility: hidden;"></div>`));
            $(element).parent().append($(`<div class="virtual-white-space no-shrink no-grow post" style="height: 0px; visibility: hidden;"></div>`));
        });

        // initialize original knockout template binding since it does know what to do
        // (note: we need the template binding, not foreach because foreach itself can't handle templates,
        // but foreach: data is equal to template: { data: data })
        return ko.bindingHandlers.template.init(element, virtualForEachBinding.makeTemplateValueAccessor([], rest[1]), allBindingsAccessor, viewModel, bindingContext);
    }

    update(element: HTMLElement,
        valueAccessor: () => virtualForEachBindingValue,
        allBindingsAccessor: KnockoutAllBindingsAccessor,
        viewModel: any,
        bindingContext: KnockoutBindingContext)
    {
        const [data, $scrollContainer, virtualChildSelector, numberOfItems, ...rest] = virtualForEachBinding.extractProperties(element, valueAccessor);
        let childHeight = rest[0];
        const template = rest[1];

        // remove any possible scroll handlerse on the element
        // and bind a new one updating the scrollY observable (see init method) on every scroll
        $scrollContainer
            .off('scroll')
            .on('scroll', function (e) {
                const elem = this as HTMLElement,
                    $elem = $(this) as JQuery;

                if (elem.scrollTop !== (elem.scrollHeight - elem.offsetHeight)) {
                    $elem.data('scrollObs')($elem.scrollTop());
                }

                e.preventDefault();
                return false;
            })
            .ready(() => {
                window.requestAnimationFrame(() => $scrollContainer.data('scrollObs').notifySubscribers(0));
                window.requestAnimationFrame(() => $scrollContainer.data('scrollObs').notifySubscribers(0));
                window.requestAnimationFrame(() => $scrollContainer.data('scrollObs').notifySubscribers(0));
            });

        $(window).resize(() => {
            $scrollContainer.data('scrollObs').valueHasMutated();
        });

        // create a knockout computed for calculating the visible items by scrollY value etc.
        const newValue = ko.computed(() => {
            // get scrollY value of the scrollContainer from the appropriate observable
            const scrollY = ko.utils.unwrapObservable($scrollContainer.data('scrollObs'));

            // get elements
            const elemClientRect = $(element).parent()[0].getBoundingClientRect();
            const containerClientRect = $scrollContainer[0].getBoundingClientRect();
            const $firstVirtualChild = $scrollContainer.find(virtualChildSelector).eq(0);
            const $parent = $(element).parent();
            const containerHeight = $scrollContainer.height();

            if (!childHeight) {
                childHeight = $firstVirtualChild.height();
            }

            const scrollValue = ($scrollContainer[0] === $parent[0])
                      ? scrollY
                      : (-($parent.offset().top - $scrollContainer.offset().top)),
                items = <any[]>ko.utils.unwrapObservable(data),
                numberOfVisibleItems = childHeight !== null
                    ? Math.floor(containerHeight / childHeight)
                    : 0,
                // if number of items is odd, e.g. 31, we get 31/2 = 15.5 and floor -> 15, ceil -> 16
                // and 15 + 16 = 31, which is the correct amount
                toleranceBefore = Math.floor(numberOfVisibleItems / 2),
                toleranceAfter = Math.ceil(numberOfVisibleItems / 2),
                firstVisibleIndex = childHeight !== null
                    ? Math.max(Math.floor(scrollValue / childHeight) - toleranceBefore, 0)
                    : 0,
                lastVisibleIndex = Math.min(firstVisibleIndex + numberOfVisibleItems + toleranceAfter, numberOfItems - 1);

            let visibleItems;

            // slice the items with firstVisibleIndex and lastVisibleIndex to get the correct part of the array
            visibleItems = items.slice(firstVisibleIndex, lastVisibleIndex + 1);

            // update virtual white space:
            // - height of prepending one equals the height of the children times the index of the first visible item, e.g. 0 * 12, 1 * 12 etc.
            // - height of the bottom one equals the difference of the total amount of the items and the last visible index times the childHeight
            // for reference: window.requestAnimationFrame tells the browser "when you next repaint, please do..."
            if ((elemClientRect.top + $(element).parent()[0].scrollHeight) >= containerClientRect.top || elemClientRect.bottom >= (containerClientRect.bottom - containerHeight)) {
                // element is visible, update white spaces
                window.requestAnimationFrame(() => {
                    $(element).parent().find('.virtual-white-space.pre').height(firstVisibleIndex * childHeight);
                    $(element).parent().find('.virtual-white-space.post').height((items.length - lastVisibleIndex - 1) * childHeight);
                });
            }

            return visibleItems;
        }).extend({ deferred: true, notify: 'always' });

        // call update method of original template binding but pass our computed as value
        // since knockout knows best what to do
        ko.bindingHandlers.template.update(element, virtualForEachBinding.makeTemplateValueAccessor(newValue, template), allBindingsAccessor, viewModel, bindingContext);
    }
}

ko.bindingHandlers.virtualForEach = new virtualForEachBinding();
ko.virtualElements.allowedBindings['virtualForEach'] = true;
