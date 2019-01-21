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
            const selection = this.saveSelection(content);
            content.innerHTML = this.internalValue;
            this.restoreSelection(content, selection);
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
        },
        updateActionStates() {
            foreach(this.actions, (action, key) => {
                this.$set(action, 'selected', document.queryCommandState(action.value));
            });
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
            this.updateActionStates();
        },
        processHighlights() {
            if (this.highlightEnabled) {
                const result = words(this.noHightlightHtml, /(<[a-z\/]{1,4}>)|[^ \n<]+/g).map(
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

        // Copied but modifed slightly from: https://stackoverflow.com/questions/14636218/jquery-convert-text-url-to-link-as-typing/14637351#14637351
        saveSelection(containerEl) {
            let start;

            if (window.getSelection && document.createRange) {
                let selection = window.getSelection();

                if (!selection || selection.rangeCount == 0) {
                    return null;
                }

                let range = selection.getRangeAt(0);
                let preSelectionRange = range.cloneRange();

                preSelectionRange.selectNodeContents(containerEl);
                preSelectionRange.setEnd(range.startContainer, range.startOffset);
                start = preSelectionRange.toString().length;

                return {
                    start: start,
                    end: start + range.toString().length,
                };
            } else if (document.selection) {
                let selectedTextRange = document.selection.createRange();
                let preSelectionTextRange = document.body.createTextRange();

                preSelectionTextRange.moveToElementText(containerEl);
                preSelectionTextRange.setEndPoint('EndToStart', selectedTextRange);
                start = preSelectionTextRange.text.length;

                return {
                    start: start,
                    end: start + selectedTextRange.text.length,
                };
            }
            return null;
        },
        // Copied but modifed slightly from: https://stackoverflow.com/questions/14636218/jquery-convert-text-url-to-link-as-typing/14637351#14637351
        restoreSelection(containerEl, savedSel) {
            if (!savedSel) {
                return null;
            }

            if (window.getSelection && document.createRange) {
                let charIndex = 0;
                let range = document.createRange();

                range.setStart(containerEl, 0);
                range.collapse(true);

                let nodeStack = [containerEl],
                    node,
                    foundStart = false,
                    stop = false;

                while (!stop && (node = nodeStack.pop())) {
                    if (node.nodeType == 3) {
                        let nextCharIndex = charIndex + node.length;

                        if (
                            !foundStart &&
                            savedSel.start >= charIndex &&
                            savedSel.start <= nextCharIndex
                        ) {
                            range.setStart(node, savedSel.start - charIndex);
                            foundStart = true;
                        }
                        if (
                            foundStart &&
                            savedSel.end >= charIndex &&
                            savedSel.end <= nextCharIndex
                        ) {
                            range.setEnd(node, savedSel.end - charIndex);
                            stop = true;
                        }
                        charIndex = nextCharIndex;
                    } else {
                        let i = node.childNodes.length;

                        while (i--) {
                            nodeStack.push(node.childNodes[i]);
                        }
                    }
                }
                let sel = window.getSelection();

                sel.removeAllRanges();
                sel.addRange(range);
            } else if (document.selection) {
                let textRange = document.body.createTextRange();
                textRange.moveToElementText(containerEl);
                textRange.collapse(true);
                textRange.moveEnd('character', savedSel.end);
                textRange.moveStart('character', savedSel.start);
                textRange.select();
            }
            return null;
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
