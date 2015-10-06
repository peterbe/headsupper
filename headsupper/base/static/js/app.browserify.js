import React from 'react';

class Form extends React.Component {
  render() {
    alert("works")
    return <button type="submit">Save</button>
  }
}

React.render(<Form/>, document.getElementById('form'));
