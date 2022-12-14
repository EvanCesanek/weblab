import { Color } from 'three';
import { Block, Text } from 'three-mesh-ui';

// https://github.com/felixmariotto/three-mesh-ui/blob/master/examples/interactive_button.js
// TODO: extends ThreeMeshUI.Block
export class XRButton extends Block {
  constructor({
    content = null,
    onSelected = () => {},
    width = 0.4,
    height = 0.15,
    justifyContent = 'center',
    offset = 0.05,
    margin = 0.02,
    borderRadius = 0.075,
  }) {
    // We start by creating objects containing options that we will use with the two buttons,
    // in order to write less code.
    const buttonOptions = {
      width: width,
      height: height,
      justifyContent: justifyContent,
      offset: offset,
      margin: margin,
      borderRadius: borderRadius,
    };
    super(buttonOptions);

    this.isButton = true;
    this.text = new Text({ content: content });
    // Add text to buttons
    this.add(this.text);

    // Options for component.setupState().
    // It must contain a 'state' parameter, which you will refer to with component.setState( 'name-of-the-state' ).
    const disabledStateAttributes = {
      state: 'disabled',
      attributes: {
        offset: 0.02,
        backgroundColor: new Color(0x999999),
        backgroundOpacity: 0.1,
        fontColor: new Color(0x555555),
      },
    };
    const hoveredStateAttributes = {
      state: 'hovered',
      attributes: {
        offset: 0.035,
        backgroundColor: new Color(0x999999),
        backgroundOpacity: 1,
        fontColor: new Color(0xffffff),
      },
    };
    const idleStateAttributes = {
      state: 'idle',
      attributes: {
        offset: 0.035,
        backgroundColor: new Color(0x666666),
        backgroundOpacity: 0.3,
        fontColor: new Color(0xffffff),
      },
    };
    const selectedAttributes = {
      offset: 0.02,
      backgroundColor: new Color(0x777777),
      fontColor: new Color(0x222222),
    };

    // setup states (adds them to a list this.states)
    this.setupState({
      state: 'selected',
      attributes: selectedAttributes,
      onSet: onSelected,
    });
    this.setupState(hoveredStateAttributes);
    this.setupState(idleStateAttributes);
    this.setupState(disabledStateAttributes);
  }
}
