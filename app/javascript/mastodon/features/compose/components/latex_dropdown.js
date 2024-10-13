import PropTypes from 'prop-types';
import { PureComponent } from 'react';

import { defineMessages, injectIntl, FormattedMessage } from 'react-intl';

import classNames from 'classnames';

import ImmutablePropTypes from 'react-immutable-proptypes';

import { supportsPassiveEvents } from 'detect-passive-events';
import Overlay from 'react-overlays/Overlay';

import { assetHost } from 'mastodon/utils/config';

const messages = defineMessages({
  inline_short:  { id: 'latex.inline.short', defaultMessage: 'Inline' },
  inline_long:   { id: 'latex.inline.long', defaultMessage: 'Notation that sits inline with other text' },
  display_short: { id: 'latex.display.short', defaultMessage: 'Display-mode' },
  display_long:  { id: 'latex.display.long', defaultMessage: 'Notation that sits on its own line' },
  start_latex:  { id: 'latex.start', defaultMessage: 'Start writing LaTeX' },
});

const listenerOptions = supportsPassiveEvents ? { passive: true, capture: true } : true;

class LaTeXDropdownMenuImpl extends PureComponent {
  static propTypes = {
    style: PropTypes.object,
    onPick: PropTypes.func.isRequired,
    intl: PropTypes.object.isRequired,
    button: PropTypes.node,
  };

  static defaultProps = {
    style: {},
  };

  state = {
  };

  handleDocumentClick = e => {
    if (this.node && !this.node.contains(e.target)) {
      this.props.onClose();
    }
  };

  componentDidMount () {
    document.addEventListener('click', this.handleDocumentClick, { capture: true });
    document.addEventListener('touchend', this.handleDocumentClick, listenerOptions);
  }

  componentWillUnmount () {
    document.removeEventListener('click', this.handleDocumentClick, { capture: true });
    document.removeEventListener('touchend', this.handleDocumentClick, listenerOptions);
  }

  setRef = c => {
    this.node = c;
  };

  getI18n = () => {
    const { intl } = this.props;

    return {
      inline_short: intl.formatMessage(messages.inline_short),
      inline_long: intl.formatMessage(messages.inline_long),
      display_short: intl.formatMessage(messages.display_short),
      display_long: intl.formatMessage(messages.display_long),
      start_latex: intl.formatMessage(messages.start_latex),
    };
  };

  handleClick = (delimiter, event) => {
    if (!(event.ctrlKey || event.metaKey)) {
      this.props.onClose();
    }
    this.props.onPick(delimiter);
  };


  render () {
    const { intl, style, button, onPick } = this.props;

    const items = [
      { icon: 'inline-mode', value: 'inline', text: intl.formatMessage(messages.inline_short), meta: intl.formatMessage(messages.inline_long) },
      { icon: 'display-mode', value: 'display', text: intl.formatMessage(messages.display_short), meta: intl.formatMessage(messages.display_long) },
    ];

    return (
      <div className={`latex-dropdown__menu`} style={style} ref={this.setRef}>
        {items.map(item => (
          <div role='option' tabIndex='0' key={item.value} data-index={item.value} onKeyDown={this.handleKeyDown} onClick={(e) => {this.handleClick(item.value, e)}} className={'latex-dropdown__option'}>
            <div className='latex-dropdown__option__icon'>
              {button || <img
                className={'latex-icon'}
                alt={item.value}
                src={`${assetHost}/latex/${item.icon}.svg`}
              />}
            </div>

            <div className='latex-dropdown__option__content'>
              <strong>{item.text}</strong>
              {item.meta}
            </div>
          </div>
        ))}
      </div>
    );
  }

}

const LaTeXDropdownMenu = injectIntl(LaTeXDropdownMenuImpl);

class LaTeXDropdown extends PureComponent {

  static propTypes = {
    onPickLaTeX: PropTypes.func.isRequired,
    intl: PropTypes.object.isRequired,
    button: PropTypes.node,
  };

  state = {
    active: false,
  };

  setRef = (c) => {
    this.dropdown = c;
  };

  onShowDropdown = () => {
    this.setState({ active: true });
  };

  onHideDropdown = () => {
    this.setState({ active: false });
  };

  onToggle = (e) => {
    if (!e.key || e.key === 'Enter') {
      if (this.state.active) {
        this.onHideDropdown();
      } else {
        this.onShowDropdown(e);
      }
    }
  };

  handleKeyDown = e => {
    if (e.key === 'Escape') {
      this.onHideDropdown();
    }
  };

  setTargetRef = c => {
    this.target = c;
  };

  findTarget = () => {
    return this.target;
  };

  setTargetRef = c => {
    this.target = c;
  };

  findTarget = () => {
    return this.target;
  };

  render () {
    const { container, intl, button, onPickLaTeX } = this.props;
    const { active } = this.state;

    const title = intl.formatMessage(messages.start_latex);

    return (
      <div className='latex-dropdown' onKeyDown={this.handleKeyDown}>
        <div ref={this.setTargetRef} className='latex-button' title={title} aria-label={title} aria-expanded={active} role='button' onClick={this.onToggle} onKeyDown={this.onToggle} tabIndex={0}>
          {button || <img
            className={classNames('latex-icon')}
            alt='𝑥'
            src={`${assetHost}/latex/latex-icon.svg`}
          />}
        </div>

        <Overlay show={active} placement={'bottom'} target={this.findTarget} popperConfig={{ strategy: 'fixed' }}>
          {({ props, placement })=> (
            <div {...props} style={{ ...props.style, width: 299 }}>
              <div className={`dropdown-animation ${placement}`}>
                <LaTeXDropdownMenu
                  onClose={this.onHideDropdown}
                  onPick={onPickLaTeX}
                />
              </div>
            </div>
          )}
        </Overlay>
      </div>
    );
  }

}

export default injectIntl(LaTeXDropdown);
