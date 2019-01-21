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
            @keydown="handleKeydown"
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

export default {
    name: 'VPell',
    props: {
        value: { type: String, default: 'this is the default test text' },
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
        this.internalValue = this.value;
        this.processHighlights();
        this.updateActionStates();
        /*
         *         this.interval = setInterval(() => {
         *             this.internalValue = document
         *                 .querySelector('.content')
         *                 .innerHTML.replace(/<div><br><\/div>/g, '<div></div>');
         *         }, 10);*/
    },
    watch: {
        highlightStyle() {
            this.processHighlights();
        },
        highlight() {
            this.processHighlights();
        },
        value() {
            if (this.internalValue != this.value) {
                this.internalValue = this.value;
                this.processHighlights();
            }
        },
        highlightEnabled() {
            this.processHighlights();
        },
        caseSensitive() {
            this.processHighlights();
        },
        internalValue() {
            const content = this.$refs.content;
            const restore = this.saveCaretPosition(content);
            content.innerHTML = this.internalValue;
            restore();
        },
    },
    computed: {
        noHightlightHtml() {
            return this.internalValue
                .replace(/<span style="background-color:yellow">/g, '')
                .replace(/<\/span>/g, '');
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
            if (firstChild && firstChild.nodeType === 3) {
                this.exec('formatBlock', `<div>`);
            } else if (content.innerHTML === '<br>') {
                this.internalValue = '';
            }
        },
        handleKeydown(event) {
            if (
                event.key === 'Enter' &&
                document.queryCommandState('formatBlock') === 'blockquote'
            ) {
                setTimeout(() => this.exec('formatBlock', `<div>`), 0);
            }
        },
        handleChange() {
            this.updateActionStates();
            const content = this.$refs.content;

            this.debouncedHandler = debounce(function() {
                if (this.internalValue !== content.innerHTML) {
                    this.internalValue = content.innerHTML;
                    this.processHighlights();
                }
            }, this.highlightDelay);
            this.debouncedHandler();
        },
        handleMouse() {
            const content = this.$refs.content;
            this.updateActionStates();

            /* let selection = window.getSelection();
             * let range = selection.getRangeAt(0);
             * range.setStart(content, 0);
             * const index = range.toString().length;
             * console.log(index);*/
        },
        processHighlights() {
            if (this.highlightEnabled) {
                const result = words(this.noHightlightHtml, /(<[a-z\/]{1,4}>)|[^ <]+/g).map(
                    word => {
                        if (this.highlight.includes(word)) {
                            return `<span style="${this.highlightStyle}">${word}</span>`;
                        }

                        return word;
                    }
                );
                this.internalValue = result.join(' ');
            }

            this.$emit('input', this.internalValue);
        },
        getNodeIndex(n) {
            var i = 0;
            while ((n = n.previousSibling)) i++;
            return i;
        },
        getTextNodeAtPosition(index, content) {
            const root = content;
            const next = function(elem) {
                console.log(elem, elem.textContent.length);
                console.log(index);
                if (index > elem.textContent.length) {
                    index -= elem.textContent.length;
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            };

            const treeWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, next);
            const c = treeWalker.nextNode();
            return { node: c ? c : root, position: c ? index : 0 };
        },
        saveCaretPosition(content) {
            let selection = window.getSelection();
            console.log(selection);
            let anchor = content; //selection.anchorNode;
            let range = selection.getRangeAt(0);
            range.setStart(anchor, 0);
            const index = range.toString().length;

            console.log(index);

            return () => {
                const pos = this.getTextNodeAtPosition(index, anchor);
                console.log(pos);
                selection.removeAllRanges();
                let newRange = new Range();
                newRange.setStart(pos.node, pos.position);
                selection.addRange(newRange);
            };
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
