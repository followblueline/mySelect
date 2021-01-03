/*
    Vue two-way binding select with filter component.
*/

// https://vuejs.org/v2/guide/components.html
var mySelect = {
    $_veeValidate: {
        name: function() {
            return this.name;
        },
        value: function () {
            //console.warn("validate", this.name, this.selectedOption.value);
            return this.selectedOption.value;
        },
        events: 'blur'//'change|blur'
    },
    // custom attributes you can register on a component. When a value is passed to a prop attribute, it becomes a property on that component instance.
    props: {
        name: String,
        options: Array,
        selectedValue: [String, Number],
        noResultMessage: String,
        optionLabel: String,
        optionValue: String,
        placeholder: String,
        filterBy: String,
        allowEmptyOption: [Boolean, String],
        emptyOptionValue: String,
        emptyOptionLabel: String
    },
    created: function () {
        /* 
        selectedValue is two way binding:
            - changing dropdown value should be emitted to parent
            - changing parent value should update dropdown
        It's antipattern in Vue2 to send back same variable, throwing Avoid mutating a prop directly since the value will be overwritten whenever the parent component re-renders. Instead, use a data or computed property based on the prop's value.
        https://forum.vuejs.org/t/update-data-when-prop-changes-data-derived-from-prop/1517/19
        1. Send the parent data to the child component through a property.
        2. In the data function I use Object.assign({}, propName) to copy the parent data to a local object.
        3. Use v-model in the child to react to form changes.
        4. Add a watch for the property that repeats the copy if the parent data changes.
        5. Use $emit to send updated data back to the parent.
        6. Use watch to update model from parent
        */
        var selectedOption = {
            value: null,
            label: null,
            obj: {}
        };
        var optionValue = 'value'; // default
        var optionLabel = 'label'; // default
        // preselect
        if (this.selectedValue != null) {
            var item = this.findItemByKey(this.selectedValue);
            if (item != null)
                this.selectThisItem(item);
        }
    },
    // from child component just emit the change
    // and let parent handle the change
    mounted: function () {
        //console.log("my-select mounted", this.$vnode.key);
        var self = this;
    },
    //beforeDestroy: function() {
    //    //document.removeEventListener('click', )
    //},
    data: function () {
        // component is not actually returning anything, just a way for each instance to maintain independent data copy
        return {
            // full obj so both value and label could be used as selected value
            selectedOption: {
                value: this.selectedValue,
                label: null,
                obj: {}
            },
            filter: null,
            stateOpen: false,
            filterByProperties: this.filterBy ? this.filterBy.split(',') : [],
            isBusy: false,
        }
    },
    computed: {
        allOptions: function () {
            var allOptions = [];
            //console.log("my-select created", this.$vnode.key, this.options.length);
            if (Array.isArray(this.options)) {
                this.optionValue = this.optionValue || 'value';
                this.optionLabel = this.optionLabel || 'label';
                if (this.allowEmptyOption === true || (this.allowEmptyOption && this.allowEmptyOption.toLowerCase() == "true")) {
                    var option = {
                        value: this.emptyOptionValue != null ? this.emptyOptionValue : '',
                        label: '',
                        obj: {}
                    };
                    option.obj[this.optionValue] = this.emptyOptionValue != null ? this.emptyOptionValue : '';
                    option.obj[this.optionLabel] = this.emptyOptionLabel != null ? this.emptyOptionLabel : '-';
                    allOptions.push(option);
                }
                // ignore label and use provided obj properties
                for (var i = 0, j = this.options.length; i < j; i++) {
                    allOptions.push({ value: this.options[i][this.optionValue], label: '', obj: this.options[i] });
                }
            }
            return allOptions;
        },
        filteredOptions: function () {
            if (this.filter) {
                var filterValueLower = (this.filter || '').toLowerCase();
                var options = [];
                for (var i = 0, j = this.allOptions.length; i < j; i++) {
                    var add = false;
                    for (var m = 0, n = this.filterByProperties.length; m < n; m++) {
                        if (this.allOptions[i]['obj'][this.filterByProperties[m]] != null && (this.allOptions[i]['obj'][this.filterByProperties[m]]).toString().toLowerCase().indexOf(filterValueLower) > -1) {
                            add = true;
                        }
                    };
                    // do not shortcircuit this flag
                    if (add) {
                        options.push(this.allOptions[i]);
                        continue;
                    }
                }
                return  options;
            } else {
                return this.allOptions;
            }
        },
        valid: function () {
            return this.fields[this.name] && this.fields[this.name].valid;
        },
        isDisabled: function () {
            return this.$attrs && this.$attrs.disabled != null && (this.$attrs.disabled || this.$attrs.disabled.toString().toLowerCase() == "disabled");
        }
    },
    watch: {
        // update model from parent
        selectedValue: function (newVal, oldVal) {
            var selectedItem = this.findItemByKey(newVal);
            this.selectedOption = {
                value: selectedItem ? selectedItem.value : null,
                label: selectedItem ? selectedItem.label : null,
                obj: selectedItem ? selectedItem.obj : {}
            }
        },
        filter: function (newVal, oldVal) {
            this.filterItemsWithValue(newVal);
            this.updateScrollPosition();
        }
    },
    methods: {
        setIsBusy: function (busy) {
            this.isBusy = busy;
        },
        // called on option click
        onOptionClick: function (option) {
            this.setIsBusy(false);
            if (option)
                this.selectThisItem(option);
            this.showhide(false);
            //console.log("change", option);
            //this.$emit('change', option ? option.value : null);
        },
        // also called from key up/down
        selectThisItem: function (item) {
            if (!item) return false;
            this.selectedOption = {
                value: item.value,
                label: item.label,
                obj: item.obj
            }
            //console.log("change/input", this.selectedOption.value);
            this.$emit('change', this.selectedOption.value);

            //this.$emit('input', this.selectedOption.value);
        },
        filterItemsWithValue: function (newVal) {
            this.filter = newVal;
            this.$emit('updatefiltervalue', newVal);
        },
        findItemByKey: function (key) {
            if (key == null || typeof (key) == 'undefined')
                return null;
            var item = this.allOptions.find(function (i) {
                return i.value.toString() === key.toString() || i.obj[this.optionLabel] === key;
            })
            return item;
        },
        // cant count on click outside as clicking on other instances of component doesnt register as click outside = doesnt close current instance 
        onContainerClick: function (e) {
            //console.log(e.target.parentElement.getAttribute("class"));
            var parentClass = e.target.parentElement.getAttribute("class");
            if (parentClass && (parentClass.indexOf("select_container") > -1 || parentClass.indexOf("selected_value") > -1))
                this.showhide();
            return false;
        },
        showhide: function (show) {
            if (this.isDisabled)
                return;
            this.setIsBusy(true);
            var stateOpen = false; // shenanigans to prevent intensive processing with large collections which block UI
            if (show !== null && typeof (show) != 'undefined' && typeof (show) == "boolean") {
                stateOpen = show;
            }
            else {
                // click outside
                stateOpen = !this.stateOpen;
            }
            if (stateOpen) {
                this.filter = null; // reset old filter
                var self = this;
                setTimeout(function () {
                    self.stateOpen = stateOpen;
                    self.$nextTick(function () {
                        self.$refs.filter.focus();
                        self.updateScrollPosition(); // in case selected item is somewhere down
                        self.setIsBusy(false);
                    });
                }, 0);
            } else {
                this.stateOpen = stateOpen;
                this.setIsBusy(false);
                this.value_ = this.selectedOption.value;

                // prepare value for blur event
                var el = this.$refs.myselect_value;
                el.value = this.value_;
                el.focus();
                el.blur();

                this.$emit('blur', this.selectedOption.value);
                //this.$emit('change', this.selectedOption.value);
                //this.$emit('input', this.selectedOption.value);
            }
        },
        // just closing, separate entry because it's not toggle and we can't send a false parameter for show
        clickoutside: function () {
            //console.log("clickoutside", this.$vnode.key);
            if (!this.stateOpen) // alread closed
                return;
            this.showhide(false);
        },
        selectNext: function () {
            var currentIndex = this.getCurrentItemIndex();
            if (currentIndex == null) currentIndex = -1;
            if (currentIndex !== null) {
                var getIndex = currentIndex + 1;
                if (getIndex < 0 && getIndex >= this.filteredOptions.length) return;
                var nextItem = this.filteredOptions[getIndex];
                this.selectThisItem(nextItem);
            }
            this.updateScrollPosition();
        },
        selectPrev: function () {
            var currentIndex = this.getCurrentItemIndex();
            if (currentIndex !== null) {
                var getIndex = currentIndex - 1;
                if (getIndex < 0 && getIndex >= this.filteredOptions.length) return;
                var prevItem = this.filteredOptions[getIndex];
                this.selectThisItem(prevItem);
            }
            this.updateScrollPosition();
        },
        updateScrollPosition: function () {
            if (this.$refs == null || this.$el == null) return;
            var currentIndex = this.getCurrentItemIndex() || 0;
            var dropdownContainer = this.$refs.dropdownContainer;
            var itemHeight = null;
            var firstItem = this.$el.querySelector("li:first-child");
            if (!firstItem)
                return;
            itemHeight = firstItem.offsetHeight;
            if (currentIndex * itemHeight + itemHeight > dropdownContainer.offsetHeight + dropdownContainer.scrollTop) {
                dropdownContainer.scrollTop = currentIndex * itemHeight;
            }
            if (currentIndex * itemHeight < dropdownContainer.scrollTop) {
                dropdownContainer.scrollTop = currentIndex * itemHeight;
            }
        },
        // select item currently focused with keys up/down
        selectCurrent: function (event) {
            console.log("selectCurrent");
            event.preventDefault(); // prevent submit
            //// uncomment to allow Enter on only one filtered result:
            //// if filter has one result, allow select on Enter
            //if (this.filteredOptions.length >= 1) {
            //    this.selectThisItem(this.filteredOptions[0]);
            //} else {
            //    return false;
            //}
            this.showhide(false);
        },
        getCurrentItemIndex: function () {
            var self = this;
            if (this.selectedOption.value == null)
                return null;
            var currentIndex = this.filteredOptions.findIndex(function (item) {
                return item.value == self.selectedOption.value && item.label == self.selectedOption.label;
            });
            return currentIndex;
        },
        // highlight current selection
        isSelected: function (item) {
            return item && item.value == this.selectedOption.value && item.label == this.selectedOption.label;
        },
        forceUpdate: function () {
            var item = this.findItemByKey(this.selectedOption.value);
            this.selectThisItem(item);
        }
    },
    directives: {
        noresult: {
            inserted: function (message) {
                this.noResultMessage = message || '';
            }
        },
        // custom click outside since we have two elements (container and absolutely positioned child)
        'click-outside-myselect': {
            bind: function (el, binding, vNode) {
                //console.log("click-outside-myselect", el.classList, el);
                if (el == null || el.classList == null || el.classList.contains('select_panel') /*|| el.classList.contains('select_container')*/)
                    return false;
                // Provided expression must evaluate to a function.
                if (typeof binding.value !== 'function') {
                    var compName = vNode.context.name
                    var warn = '[Vue-click-outside:] provided expression ' + binding.expression + ' is not a function, but has to be';
                    if (compName)
                        warn += 'Found in component ' + compName;
                    console.warn(warn);
                }
                // Define Handler and cache it on the element
                var bubble = binding.modifiers.bubble;
                var handler = function (e) {
                    if (bubble || (!el.contains(e.target) && el !== e.target)) {
                        binding.value(e)
                    }
                }
                el.__vueClickOutside__ = handler;

                // add Event Listeners
                document.addEventListener('click', handler);
            },

            unbind: function (el, binding) {
                // Remove Event Listeners
                document.removeEventListener('click', el.__vueClickOutside__);
                el.__vueClickOutside__ = null;

            }
        }
    },
    template: '<div v-bind:class="{select_container: true, busy: isBusy, disabled: isDisabled}" tabindex="0" name="myselect_container" v-bind:data-for="name" \
            v-click-outside-myselect="clickoutside"\
            @click="onContainerClick"\
            v-on:keyup.down="selectNext" v-on:keyup.up="selectPrev" v-on:keyup.enter="selectCurrent" v-on:keyup.esc="showhide(false)"\
            >\
        <div class="selected_value"  :class="{open : stateOpen}">\
            <input type="text" :name="name" ref="myselect_value" class="myselect_value">\
            <span v-if="selectedOption == null || selectedOption.value == null">{{placeholder}}</span>\
            <span v-else class="selected_value_inner">\
                <slot v-bind:selectedOption="selectedOption" name="selected-option">{{selectedOption.label}}</slot>\
            </span>\
        </div>\
        <div class="select_panel" v-show="stateOpen" v-click-outside-myselect="clickoutside" \
            >\
            <div class="filter_container">\
                <input type="text" v-model="filter" ref="filter" name="myselect_filter" v-bind:data-for="name">\
            </div>\
            <div class="items" ref="dropdownContainer">\
                <ul>\
                    <li v-for="option in filteredOptions" v-bind:value="option.value" @click="onOptionClick(option)" v-bind:class="{selected: isSelected(option)}" v-bind:key="option.value">\
                        <slot v-bind:option="option" name="label">{{option.label}}</slot>\
                    </li >\
                </ul>\
                <div class="noresults" v-show="!filteredOptions || filteredOptions.length == 0"><span>{{noResultMessage}}</span></div>\
            </div>\
        </div>\
    </div>'
};
