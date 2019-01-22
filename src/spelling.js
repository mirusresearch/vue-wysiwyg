import { Mark, Node } from 'tiptap';
import { replaceText } from 'tiptap-commands';
import SuggestionsPlugin from './SuggestionsPlugin.js';

export default class Spelling extends Mark {
    get name() {
        return 'spelling';
    }

    get defaultOptions() {
        return {
            word: null,
            spellingClass: 'spelling',
            suggestionClass: 'is-highlighted',
        };
    }

    get schema() {
        return {
            parseDOM: [
                {
                    tag: 'span',
                    class: 'is-highlighted',
                },
            ],
            toDOM: mark => {
                return mark.attrs.label;
            },
        };
    }

    commands({ schema }) {
        return attrs => replaceText(null, schema.marks[this.name], attrs);
    }

    get plugins() {
        return [
            SuggestionsPlugin({
                command: ({ range, schema, attrs }) => {
                    console.log('here', attrs);
                    return replaceText(range, schema.marks[this.name], attrs);
                },
                appendText: ' ',
                word: this.options.word,
                items: this.options.items,
                onEnter: this.options.onEnter,
                onChange: this.options.onChange,
                onExit: this.options.onExit,
                onKeyDown: this.options.onKeyDown,
                onFilter: this.options.onFilter,
                suggestionClass: this.options.suggestionClass,
            }),
        ];
    }
}
