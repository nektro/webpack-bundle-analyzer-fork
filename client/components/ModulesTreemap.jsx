/** @jsx h */
import { h, Component } from 'preact';
import filesize from 'filesize';

import Treemap from './Treemap';
import Tooltip from './Tooltip';
import Switcher from './Switcher';
import Sidebar from './Sidebar';
import CheckboxList from './CheckboxList';
import ModuleDetails from './ModuleDetails';

import s from './ModulesTreemap.css';

const SIZE_SWITCH_ITEMS = [
  { label: 'Stat', prop: 'statSize' },
  { label: 'Parsed', prop: 'parsedSize' },
  { label: 'Gzipped', prop: 'gzipSize' }
];

export default class ModulesTreemap extends Component {

  constructor(props) {
    super(props);

    this.state = {
      activeModule: null
    };

    this.setData(props.data, true);
  }

  componentDidMount() {
    document.addEventListener('keydown', this.handleDocumentKeydown);
  }

  componentWillReceiveProps(newProps) {
    if (newProps.data !== this.props.data) {
      this.setData(newProps.data);
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (!!this.state.activeModule !== !!prevState.activeModule) {
      this.treemap.resize();
    }
  }

  render() {
    const { data, showTooltip, tooltipContent, activeSizeItem, activeModule } = this.state;

    return (
      <div className={s.container}>
        <Sidebar position="left" showOnMount>
          <div className={s.sidebarGroup}>
            <Switcher label="Treemap sizes"
              items={this.sizeSwitchItems}
              activeItem={activeSizeItem}
              onSwitch={this.handleSizeSwitch}/>
          </div>
          {this.state.chunkItems.length > 1 &&
            <div className={s.sidebarGroup}>
              <CheckboxList label="Show chunks"
                items={this.state.chunkItems}
                checkedItems={this.visibleChunkItems}
                renderLabel={this.renderChunkItemLabel}
                onChange={this.handleVisibleChunksChange}/>
            </div>
          }
        </Sidebar>
        <Treemap ref={this.setTreemapRef}
          className={s.map}
          data={data}
          weightProp={activeSizeItem.prop}
          highlightedGroupIds={this.state.highlightedGroupIds}
          onMouseLeave={this.handleMouseLeaveTreemap}
          onGroupHover={this.handleTreemapGroupHover}
          onGroupCtrlClick={this.handleTreemapGroupCtrlClick}/>
        {activeModule &&
          <Sidebar className={s.staticSidebar} position="right" forceVisible>
            <ModuleDetails module={activeModule}/>
          </Sidebar>
        }
        <Tooltip visible={showTooltip} container={this.treemap ? this.treemap.node : null}>
          {tooltipContent}
        </Tooltip>
      </div>
    );
  }

  renderModuleSize(module, sizeType) {
    const sizeProp = `${sizeType}Size`;
    const size = module[sizeProp];
    const sizeLabel = SIZE_SWITCH_ITEMS.find(item => item.prop === sizeProp).label;
    const isActive = (this.state.activeSizeItem.prop === sizeProp);

    return (typeof size === 'number') ?
      <div className={isActive ? s.activeSize : ''}>
        {sizeLabel} size: <strong>{filesize(size)}</strong>
      </div>
      :
      null;
  }

  renderChunkItemLabel = (item, labelClass) => {
    const isAllItem = (item === CheckboxList.ALL_ITEM);
    const label = isAllItem ? 'All' : item.label;
    const size = isAllItem ? this.totalChunksSize : item[this.state.activeSizeItem.prop];

    return (
      <span className={labelClass}>{label} (<strong>{filesize(size)}</strong>)</span>
    );
  };

  handleSizeSwitch = sizeSwitchItem => {
    this.setState({ activeSizeItem: sizeSwitchItem });
  };

  handleVisibleChunksChange = visibleChunkItems => {
    this.visibleChunkItems = visibleChunkItems;
    this.setState({ data: this.getVisibleChunksData() });
  };

  handleMouseLeaveTreemap = () => {
    this.setState({ showTooltip: false });
  };

  handleTreemapGroupHover = event => {
    const { group } = event;

    if (group) {
      this.setState({
        showTooltip: true,
        tooltipContent: this.getTooltipContent(group),
        highlightedGroupIds: group.requiredBy || []
      });
    } else {
      this.setState({ showTooltip: false });
    }
  };

  handleTreemapGroupCtrlClick = event => {
    const { group } = event;

    console.log(group);

    this.setState({
      activeModule: group
    });
  };

  handleDocumentKeydown = event => {
    if (event.key === 'Escape' && this.state.activeModule) {
      this.setState({ activeModule: null });
    }
  }

  setTreemapRef = comp => this.treemap = comp;

  get totalChunksSize() {
    const sizeProp = this.state.activeSizeItem.prop;
    return this.props.data.reduce((totalSize, chunk) => totalSize + chunk[sizeProp], 0);
  }

  setData(data, initial) {
    const hasParsedSizes = (typeof data[0].parsedSize === 'number');
    this.sizeSwitchItems = hasParsedSizes ? SIZE_SWITCH_ITEMS : SIZE_SWITCH_ITEMS.slice(0, 1);
    const activeSizeItemProp = initial ? `${this.props.defaultSizes}Size` : this.state.activeSizeItem.prop;
    let activeSizeItem = this.sizeSwitchItems.find(item => item.prop === activeSizeItemProp);
    if (!activeSizeItem) activeSizeItem = this.sizeSwitchItems[0];

    const chunkItems = [...data]
      .sort((chunk1, chunk2) => chunk2[activeSizeItem.prop] - chunk1[activeSizeItem.prop]);

    if (initial) {
      this.visibleChunkItems = chunkItems;
    }

    this.setState({
      data: this.getVisibleChunksData(),
      showTooltip: false,
      tooltipContent: null,
      highlightedGroupIds: [],
      activeSizeItem,
      chunkItems
    });
  }

  getVisibleChunksData() {
    return this.props.data.filter(chunk =>
      this.visibleChunkItems.find(item => item.label === chunk.label)
    );
  }

  getTooltipContent(module) {
    if (!module) return null;

    return (
      <div>
        <div><strong>{module.label}</strong></div>
        <br/>
        {this.renderModuleSize(module, 'stat')}
        {!module.inaccurateSizes && this.renderModuleSize(module, 'parsed')}
        {!module.inaccurateSizes && this.renderModuleSize(module, 'gzip')}
        {module.path &&
          <div>Path: <strong>{module.path}</strong></div>
        }
      </div>
    );
  }

}
