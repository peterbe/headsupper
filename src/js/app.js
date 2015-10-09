import React from 'react';
import 'whatwg-fetch';


class Form extends React.Component {

  constructor() {
    super();
    this.state = {
        advanced: false,
        csrfmiddlewaretoken: null
    };
    fetch('/api/csrf')
    .then(function(response) {
      return response.json();
    })
    .then((token) => {
      this.setState({csrfmiddlewaretoken: token});
    })
    .catch((ex) => {
      alert(ex);
    });
  }

  toggleAdvancedForm() {
    this.setState({advanced: !this.state.advanced});
  }

  submitForm(event) {
    event.preventDefault();
    if (!this.state.csrfmiddlewaretoken) {
      throw new Error("No CSRF token aquired");
    }
    console.log('SUBMIT!');
  }

  render() {
    return <form className="ui form" onSubmit={this.submitForm.bind(this)}>
      <div className="ui toggle checkbox" style={{float:'right'}}>
        <input
            name="advanced" type="checkbox"
            onChange={this.toggleAdvancedForm.bind(this)}/>
        <label>Toggle advanced fields</label>
      </div>

      <div className="field required">
        <label>GitHub Full Name</label>
        <input
            name="github_full_name"
            tabIndex="0"
            placeholder="e.g. mozilla/socorro"
            type="text"/>
      </div>
      <div className={this.state.advanced ? 'field' : 'hidden'}>
        <label>Trigger Word</label>
        <input
            name="trigger_word"
            tabIndex="1"
            defaultValue="Headsup"
            type="text"/>
      </div>
      <div className={this.state.advanced ? 'field' : 'hidden'}>
        <div className="ui checkbox">
          <input
              className="hidden"
              name="case_sensitive_trigger_word"
              tabIndex="2"
              type="checkbox"/>
            <label>Case-<b>sensitive</b> trigger word</label>
        </div>
      </div>
      <div className="field required">
        <label>Send To</label>
        <textarea
            rows="2"
            name="send_to"
            tabIndex="3"
            placeholder="email addresses separated by ; or newline"
            ></textarea>
      </div>
      <div className={this.state.advanced ? 'field' : 'hidden'}>
        <label>Send CC</label>
        <textarea
            rows="2"
            name="send_cc"
            placeholder="email addresses separated by ; or newline"
            tabIndex="3"
            ></textarea>
      </div>
      <div className={this.state.advanced ? 'field' : 'hidden'}>
        <label>Send BCC</label>
        <textarea
            rows="2"
            name="send_bcc"
            placeholder="email addresses separated by ; or newline"
            tabIndex="4"
            ></textarea>
      </div>
      <div className={this.state.advanced ? 'field' : 'hidden'}>
        <div className="ui checkbox">
          <input
              className="hidden"
              name="cc_commit_author"
              type="checkbox"
              tabIndex="5"/>
            <label>CC the commit author always</label>
        </div>
      </div>
      <div className={this.state.advanced ? 'field' : 'hidden'}>
        <div className="ui checkbox">
          <input
              className="hidden"
              name="on_tag_only"
              tabIndex="6"
              type="checkbox"/>
            <label>Only send when a new tag is created</label>
        </div>
      </div>
      <button className="ui primary button" type="submit">Save</button>
    </form>
  }
}


class Instructions extends React.Component {
  constructor() {
    super();
    this.state = {
      payloadUrl: 'https://headsupper.dev',  // XXX be starter about this
    };
  }
  render() {
    return (
      <div>
        <h2 className="ui dividing header">
          1. Prepare your first configuration
        </h2>

        <Form/>

        <h2 className="ui dividing header">
          2. Tell GitHub about it
        </h2>
        <ol>
          <li>Go to your repository's Settings page</li>
          <li>Click on <b>Webhooks &amp; services</b></li>
          <li>Click the "Add webhook" button</li>
          <li>
            <ol>
              <li>On <b>Payload URL</b> type in <code>{this.state.payloadUrl}</code></li>
              <li>On <b>Content type</b> leave it set to <code>application/json</code></li>
              <li>On <b>Secret</b> type in <code></code></li>
              <li>On <b>Which events would you like to trigger this webhook?</b> keep to on
                <code>Just the push event</code></li>
              <li>Leave the <b>Active</b> checkbox on</li>
            </ol>
          </li>
          <li>Press the green <b>Add webhook</b> button</li>
        </ol>
      </div>
    )
  }
}

class Homepage extends React.Component {
  constructor() {
    super();
    this.state = {
      signedin: null,
    };
    fetch('/api/signedin', {credentials: 'same-origin'})
    .then((response) => {
      return response.json();
    })
    .then((signedin) => {
      this.setState({signedin: signedin});
    })
    .catch((ex) => {
      alert(ex);
    });
  }

  render() {
    if (this.state.signedin === null) {
      return <p>Loading...</p>
    } else if (this.state.signedin && this.state.signedin.username) {
      return (
        <div>
          <p>
            You are signed in as <b>{this.state.signedin.username}</b>!
            &nbsp; <a href="/accounts/logout/">Sign out</a>
          </p>
          <Instructions/>
        </div>
      )
    } else {
      return (
        <div>
        <p>You have to sign in</p>
        <p><a href="/accounts/github/login/">Sign in with GitHub</a></p>
        </div>
      )
    }
  }
}

React.render(<Homepage/>, document.getElementById('mount-point'));
