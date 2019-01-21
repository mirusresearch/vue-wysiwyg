<template>
    <div class="editor">
        <div class="actionbar">
            <button
                v-for="action in actions"
                @click="exec(action.value)"
                :title="action.title"
                :class="{ selected: action.selected }"
                v-bind:key="action.title"
            >
                <span v-html="action.icon"></span>
            </button>
        </div>

        <div
            class="content"
            contenteditable="true"
            ref="content"
            @input="handleInput"
            @keyup="handleChange"
            @mouseup="handleMouse"
        >
        </div>
    </div>
</template>

<script>
import debounce from 'lodash.debounce';
import words from 'lodash.words';
import foreach from 'lodash.foreach';
import rangy from 'rangy-updated/lib/rangy-core';
import 'rangy-updated/lib/rangy-selectionsaverestore';

export default {
    name: 'VPell',
    props: {
        value: { type: String, default: '<div>this is the default test text </div>' },
        highlight: { type: Array, default: () => ['test'] },
        highlightStyle: {
            type: String,
            default: 'background-color:yellow',
        },
        highlightEnabled: {
            type: Boolean,
            default: true,
        },
        highlightDelay: {
            type: Number,
            default: 500, //This is milliseconds
        },
        caseSensitive: {
            type: Boolean,
            default: false,
        },
    },
    data() {
        return {
            internalValue: '',
            debouncedHandler: null,
            actions: {
                bold: {
                    icon: '<b>B</b>',
                    title: 'Bold',
                    value: 'bold',
                },
                italic: {
                    icon: '<i>I</i>',
                    title: 'Italic',
                    value: 'italic',
                },
                ulist: {
                    icon: '&#8226;',
                    title: 'Unordered List',
                    value: 'insertUnorderedList',
                },
            },
        };
    },
    mounted() {
        rangy.init();

        if (!/<div>.*?<\/div>/g.test(this.value)) {
            this.internalValue = `<div>${this.value}</div>`;
        } else {
            this.internalValue = this.value;
        }
        this.$refs.content.innerHTML = this.addHighlights(this.internalValue);
        this.updateActionStates();
    },
    watch: {
        highlightStyle() {
            this.addHighlights(this.$refs.content.innerHTML);
        },
        highlight() {
            this.addHighlights(this.$refs.content.innerHTML);
        },
        value() {
            if (this.internalValue != this.value) {
                this.internalValue = this.value;
                this.processHighlights();
            }
        },
        highlightEnabled() {
            this.addHighlights(this.$refs.content.innerHTML);
        },
        caseSensitive() {
            this.addHighlights(this.$refs.content.innerHTML);
        },
    },
    computed: {
        noHightlightHtml() {
            return this.internalValue
                .replace(/<a style="background-color:yellow">/g, '')
                .replace(/<\/a>/g, '');
        },
    },
    methods: {
        exec(command, value = null) {
            document.execCommand(command, false, value);
            this.handleChange();
            this.updateActionStates();
        },
        updateActionStates() {
            foreach(this.actions, (action, key) => {
                this.$set(action, 'selected', document.queryCommandState(action.value));
            });
        },
        handleInput({ target: { firstChild } }) {
            const content = this.$refs.content;
            if (content.innerHTML === '<br>') {
                this.internalValue = '';
            }
        },
        handleChange() {
            if (this.debouncedHandler) {
                this.debouncedHandler.cancel();
            }
            this.updateActionStates();
            const content = this.$refs.content;

            this.debouncedHandler = debounce(function() {
                if (this.internalValue !== content.innerHTML) {
                    const savedSel = rangy.saveSelection();
                    content.innerHTML = this.addHighlights(content.innerHTML);
                    rangy.restoreSelection(savedSel);
                    this.internalValue = content.innerHTML;
                    this.$emit('input', this.internalValue);
                }
            }, this.highlightDelay);
            this.debouncedHandler();
        },
        handleMouse() {
            this.updateActionStates();
        },
        addHighlights(html) {
            let cleaned = html
                .replace(/<a style="background-color:yellow">/g, '')
                .replace(/<\/a>/g, '');

            if (this.highlightEnabled) {
                foreach(this.highlight, singleHighlight => {
                    cleaned = cleaned.replace(
                        RegExp(singleHighlight, 'g'),
                        `<a style="${this.highlightStyle}">${singleHighlight}</a>`,
                        'g'
                    );
                });

                return cleaned;
            }

            return html;
        },
    },
};
</script>

<style lang="scss" scoped>
.editor {
    border: 1px solid hsla(0, 0%, 4%, 0.1);

    .actionbar {
        border-bottom: 1px solid hsla(0, 0%, 4%, 0.1);

        button {
            background-color: transparent;
            border: none;
            cursor: pointer;
            height: 30px;
            outline: 0;
            width: 30px;
            vertical-align: bottom;

            &.selected,
            &:hover {
                background-color: #f0f0f0;
            }
        }
    }

    .content {
        font-size: 16px;
        height: 300px;
        outline: 0;
        overflow-y: auto;
        padding: 10px;
    }
}
</style>
