import React from 'react'
const GraphContainer = React.forwardRef((props, ref) => {
  return (
    <svg
      ref={ref}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%'
      }}
    />
  );
});
export default GraphContainer