import React from 'react';
import AutosuggestAccountContainer from '../features/compose/containers/autosuggest_account_container';
import AutosuggestEmoji from './autosuggest_emoji';
import AutosuggestLatex from './autosuggest_latex';
import AutosuggestUnicodeMath from './autosuggest_unicodemath';
import AutosuggestHashtag from './autosuggest_hashtag';
import ImmutablePropTypes from 'react-immutable-proptypes';
import PropTypes from 'prop-types';
import ImmutablePureComponent from 'react-immutable-pure-component';
import Textarea from 'react-textarea-autosize';
import classNames from 'classnames';

const textAtCursorMatchesToken = (str, caretPosition) => {
  let word;
  let left;
  let right;

  /* If the caret is inside a LaTeX expression, this matches a latex token.
   * First: try to track leftwards from the caret position to an opening delimiter, without seeing a closing delimiter first.
   */
  const re_latex = /\\[\(\[](?:(?!\\[\)\]])(?:.|\n))*(?!\n)$/m;
  left = str.slice(0, caretPosition).search(re_latex);
  if (left >= 0) {

    /* Next: Try to find the end of the expression - either a closing or ending delimiter or something that looks like a word.
     *
     * Examples: (Caret position marked with the character |)
     *
     * Starting delimiter:  \( x| \(y\)         This looks like two separate expressions, and the user hasn't typed the closing delimiter of the leftmost one yet.
     * Closing delimier:    \( x| \)            The user is editing a correctly delimited expression.
     * Wordlike:            \( x| belongs to    The user is adding a LaTeX expression inside a passage of prose.
     */
    let remainder = str.slice(caretPosition);
    const next_start_delimiter = remainder.search(/\\[\(\[]/);
    let end = str.length;

    /* If a starting delimiter is found, then we shouldn't go beyond that, but there might be a closing delimiter or a word before it. */
    if(next_start_delimiter >= 0) {
      remainder = remainder.slice(0, next_start_delimiter);
      end = caretPosition + next_start_delimiter;
    }
    const next_end_delimiter = remainder.search(/\\[\)\]]/);
    const next_wordlike = remainder.search(/\s(?:[\p{Ll}\p{Lu}\p{Lo}\p{Lt}]{2,})/u);
    right = next_end_delimiter>=0 ? next_end_delimiter : next_wordlike;
    if (right < 0) {
      /* If no closing delimiter or word was found, assume the whole string from the starting delimiter to the end is LaTeX. */
      word = str.slice(left, end);
    } else {
      if(str.slice(caretPosition + right).match(/^\s/)) {
        /* If there is a word after the expression, don't include it. */
        word = str.slice(left, right + caretPosition);
      } else {
        /* Otherwise, there is a closing delimiter, so include it. */
        word = str.slice(left, right + caretPosition + 2);
      }
    }
    /* Don't match when there's just an opening delimiter and no other non-whitespace characters. */
    if (word.trim().length >= 3) {
      return [left + 1, word];
    }
  }

  /* If no LaTeX match was found, look for the other token types: mention, emoji, hashtag. */

  left  = str.slice(0, caretPosition).search(/\S+$/);
  right = str.slice(caretPosition).search(/\s/);

  if (right < 0) {
    word = str.slice(left);
  } else {
    word = str.slice(left, right + caretPosition);
  }

  if (!word || word.trim().length < 3 || ['@', ':', '#'].indexOf(word[0]) === -1) {
    return [null, null];
  }

  word = word.trim().toLowerCase();

  if (word.length > 0) {
    return [left + 1, word];
  } else {
    return [null, null];
  }
};

export default class AutosuggestTextarea extends ImmutablePureComponent {

  static propTypes = {
    value: PropTypes.string,
    suggestions: ImmutablePropTypes.list,
    disabled: PropTypes.bool,
    placeholder: PropTypes.string,
    onSuggestionSelected: PropTypes.func.isRequired,
    onSuggestionsClearRequested: PropTypes.func.isRequired,
    onSuggestionsFetchRequested: PropTypes.func.isRequired,
    onChange: PropTypes.func.isRequired,
    onKeyUp: PropTypes.func,
    onKeyDown: PropTypes.func,
    onPaste: PropTypes.func.isRequired,
    autoFocus: PropTypes.bool,
    lang: PropTypes.string,
  };

  static defaultProps = {
    autoFocus: true,
  };

  state = {
    suggestionsHidden: true,
    focused: false,
    selectedSuggestion: 0,
    lastToken: null,
    tokenStart: 0,
  };

  onChange = (e) => {
    const [ tokenStart, token ] = textAtCursorMatchesToken(e.target.value, e.target.selectionStart);

    if (token !== null && this.state.lastToken !== token) {
      this.setState({ lastToken: token, selectedSuggestion: 0, tokenStart });
      this.props.onSuggestionsFetchRequested(token);
    } else if (token === null) {
      this.setState({ lastToken: null });
      this.props.onSuggestionsClearRequested();
    }

    this.props.onChange(e);
  };

  onKeyDown = (e) => {
    const { suggestions, disabled } = this.props;
    const { selectedSuggestion, suggestionsHidden } = this.state;

    if (disabled) {
      e.preventDefault();
      return;
    }

    if (e.which === 229 || e.isComposing) {
      // Ignore key events during text composition
      // e.key may be a name of the physical key even in this case (e.x. Safari / Chrome on Mac)
      return;
    }

    switch(e.key) {
    case 'Escape':
      if (suggestions.size === 0 || suggestionsHidden) {
        document.querySelector('.ui').parentElement.focus();
      } else {
        e.preventDefault();
        this.setState({ suggestionsHidden: true });
      }

      break;
    case 'ArrowDown':
      if (suggestions.size > 0 && !suggestionsHidden) {
        e.preventDefault();
        this.setState({ selectedSuggestion: Math.min(selectedSuggestion + 1, suggestions.size - 1) });
      }

      break;
    case 'ArrowUp':
      if (suggestions.size > 0 && !suggestionsHidden) {
        e.preventDefault();
        this.setState({ selectedSuggestion: Math.max(selectedSuggestion - 1, 0) });
      }

      break;
    case 'Enter':
    case 'Tab':
      // Select suggestion
      if (this.state.lastToken !== null && suggestions.size > 0 && !suggestionsHidden) {
        e.preventDefault();
        e.stopPropagation();
        this.props.onSuggestionSelected(this.state.tokenStart, this.state.lastToken, suggestions.get(selectedSuggestion));
      }

      break;
    }

    if (e.defaultPrevented || !this.props.onKeyDown) {
      return;
    }

    this.props.onKeyDown(e);
  };

  onBlur = () => {
    this.setState({ suggestionsHidden: true, focused: false });
  };

  onFocus = (e) => {
    this.setState({ focused: true });
    if (this.props.onFocus) {
      this.props.onFocus(e);
    }
  };

  onSuggestionClick = (e) => {
    const suggestion = this.props.suggestions.get(e.currentTarget.getAttribute('data-index'));
    e.preventDefault();
    this.props.onSuggestionSelected(this.state.tokenStart, this.state.lastToken, suggestion);
    this.textarea.focus();
  };

  componentWillReceiveProps (nextProps) {
    if (nextProps.suggestions !== this.props.suggestions && nextProps.suggestions.size > 0 && this.state.suggestionsHidden && this.state.focused) {
      this.setState({ suggestionsHidden: false });
    }
  }

  setTextarea = (c) => {
    this.textarea = c;
  };

  onPaste = (e) => {
    if (e.clipboardData && e.clipboardData.files.length === 1) {
      this.props.onPaste(e.clipboardData.files);
      e.preventDefault();
    }
  };

  renderSuggestion = (suggestion, i) => {
    const { selectedSuggestion } = this.state;
    let inner, key;

    if (suggestion.type === 'emoji') {
      inner = <AutosuggestEmoji emoji={suggestion} />;
      key   = suggestion.id;
    } else if (suggestion.type === 'hashtag') {
      inner = <AutosuggestHashtag tag={suggestion} />;
      key   = suggestion.name;
    } else if (suggestion.type === 'account') {
      inner = <AutosuggestAccountContainer id={suggestion.id} />;
      key   = suggestion.id;
    } else if (suggestion.type === 'latex') {
      inner = <AutosuggestLatex latex={suggestion} />;
      key   = 'latex'+suggestion.expression;
    } else if (suggestion.type === 'unicodemath') {
      inner = <AutosuggestUnicodeMath latex={suggestion} />;
      key   = 'unicodemath'+suggestion.expression;
    }

    return (
      <div role='button' tabIndex='0' key={key} data-index={i} className={classNames('autosuggest-textarea__suggestions__item', { selected: i === selectedSuggestion })} onMouseDown={this.onSuggestionClick}>
        {inner}
      </div>
    );
  };

  render () {
    const { value, suggestions, disabled, placeholder, onKeyUp, autoFocus, lang, children } = this.props;
    const { suggestionsHidden } = this.state;

    return [
      <div className='compose-form__autosuggest-wrapper' key='autosuggest-wrapper'>
        <div className='autosuggest-textarea'>
          <label>
            <span style={{ display: 'none' }}>{placeholder}</span>

            <Textarea
              ref={this.setTextarea}
              className='autosuggest-textarea__textarea'
              disabled={disabled}
              placeholder={placeholder}
              autoFocus={autoFocus}
              value={value}
              onChange={this.onChange}
              onKeyDown={this.onKeyDown}
              onInput={this.onInput}
              onKeyUp={onKeyUp}
              onFocus={this.onFocus}
              onBlur={this.onBlur}
              onPaste={this.onPaste}
              dir='auto'
              aria-autocomplete='list'
              lang={lang}
            />
          </label>
        </div>
        {children}
      </div>,

      <div className='autosuggest-textarea__suggestions-wrapper' key='suggestions-wrapper'>
        <div className={`autosuggest-textarea__suggestions ${suggestionsHidden || suggestions.isEmpty() ? '' : 'autosuggest-textarea__suggestions--visible'}`}>
          {suggestions.map(this.renderSuggestion)}
        </div>
      </div>,
    ];
  }

}
