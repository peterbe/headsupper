import React from 'react';
import ReactDOM from 'react-dom';
import 'whatwg-fetch';

class Form extends React.Component {

  constructor() {
    super();

    this.state = {
        advanced: false,
        loading: false,
        csrfmiddlewaretoken: null,
        errors: null,
    };

    fetch('/api/csrf', {credentials: 'same-origin'})
    .then(function(response) {
      return response.json();
    })
    .then((token) => {
      this.setState({csrfmiddlewaretoken: token.csrf_token});
    })
    .catch((ex) => {
      alert(ex);
    });
  }

  toggleAdvancedForm() {
    this.setState({advanced: !this.state.advanced});
  }

  _postJSON(url, data) {
    return fetch(url, {
      method: 'post',
      credentials: 'same-origin',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
  }

  submitForm(event) {
    event.preventDefault();
    if (!this.state.csrfmiddlewaretoken) {
      throw new Error("No CSRF token aquired");
    }
    var data = {};
    data.csrfmiddlewaretoken = this.state.csrfmiddlewaretoken;

    let getValue = (ref) => {
      if (ref.type === 'checkbox') {
        return ref.checked;
      }
      return ref.value.trim();
    }
    let refs = [
      'github_full_name',
      'github_webhook_secret',
      'trigger_word',
      'case_sensitive_trigger_word',
      'send_to',
      'send_cc',
      'send_bcc',
      'cc_commit_author',
      'on_tag_only',
    ];
    refs.forEach((key) => {
      let ref = this.refs[key];
      if (ref === undefined) {
        throw new Error('Invalid key: ' + key);
      }
      data[key] = getValue(ref);
    });
    // console.log('SUBMIT', data);
    this.setState({loading: true});
    this._postJSON('/api/projects/add', data)
    .then((response) => {
      this.setState({loading: false})
      return response.json()
    })
    .then((json) => {
      if (json._errors) {
        // oh no! validation errors!
        console.log("VALIDATION ERRORS!", json._errors);
        this.setState({errors: json._errors});
      } else {
        let secret = this.refs.github_webhook_secret.value;
        refs.forEach((key) => {
          let ref = this.refs[key];
          if (ref.type === 'checkbox') {
            ref.checked = false;
          } else {
            ref.value = '';
          }
        });
        if (this.state.errors !== null) {
          this.setState({errors: null});
        }
        this.props.onSave(secret);
      }
    })
    .catch((ex) => {
      console.log('parsing failed', ex)
    });
  }

  render() {
    let formClassName = 'ui form';
    if (this.state.loading) {
      formClassName += ' loading';
    }
    if (this.state.errors !== null) {
      formClassName += ' error';
    }

    let requiredFields = [
      'github_full_name',
      'github_webhook_secret',
      'send_to',
    ];
    let getFieldClassName = (field) => {
      let className = ['field'];
      if (requiredFields.indexOf(field) > -1) {
        className.push('required');
      } else {
        if (!this.state.advanced) {
          className.push('hidden');
        }
      }
      if (this.state.errors !== null && this.state.errors[field]) {
        className.push('error');
      }
      return className.join(' ');
    }

    return <form
        className={formClassName}
        onSubmit={this.submitForm.bind(this)}>
      <div className="ui toggle checkbox" style={{float:'right'}}>
        <input
            name="advanced" type="checkbox"
            onChange={this.toggleAdvancedForm.bind(this)}/>
        <label>Toggle advanced fields</label>
      </div>

      <div className={getFieldClassName('github_full_name')}>
        <label>GitHub Full Name</label>
        <input
            ref="github_full_name"
            tabIndex="0"
            placeholder="e.g. mozilla/socorro"
            type="text"/>
      </div>
      <div className={getFieldClassName('github_webhook_secret')}>
        <label>GitHub Webhook Secret</label>
        <input
            ref="github_webhook_secret"
            tabIndex="10"
            placeholder="pick a secret word"
            type="text"/>
      </div>
      <div className={getFieldClassName('trigger_word')}>
        <label>Trigger Word</label>
        <input
            ref="trigger_word"
            tabIndex="20"
            defaultValue="Headsup"
            type="text"/>
      </div>
      <div className={getFieldClassName('case_sensitive_trigger_word')}>
        <div className="ui checkbox toggle">
          <input
              ref="case_sensitive_trigger_word"
              tabIndex="30"
              type="checkbox"
              />
            <label>Case-<b>sensitive</b> trigger word</label>
        </div>
      </div>
      <div className={getFieldClassName('send_to')}>
        <label>Send To</label>
        <textarea
            rows="2"
            ref="send_to"
            tabIndex="40"
            placeholder="email addresses separated by ; or newline"
            ></textarea>
      </div>
      <div className={getFieldClassName('send_cc')}>
        <label>Send CC</label>
        <textarea
            rows="2"
            ref="send_cc"
            placeholder="email addresses separated by ; or newline"
            tabIndex="50"
            ></textarea>
      </div>
      <div className={getFieldClassName('send_bcc')}>
        <label>Send BCC</label>
        <textarea
            rows="2"
            ref="send_bcc"
            placeholder="email addresses separated by ; or newline"
            tabIndex="60"
            ></textarea>
      </div>
      <div className={getFieldClassName('cc_commit_author')}>
        <div className="ui checkbox toggle">
          <input
              ref="cc_commit_author"
              type="checkbox"
              tabIndex="70"/>
            <label>CC the commit author always</label>
        </div>
      </div>
      <div className={getFieldClassName('on_tag_only')}>
        <div className="ui checkbox toggle">
          <input
              ref="on_tag_only"
              tabIndex="80"
              type="checkbox"/>
            <label>Only send when a new tag is created</label>
        </div>
      </div>
      { this.state.errors ? <ValidationErrors errors={this.state.errors} /> : null }
      <button
          tabIndex="90"
          className="ui primary button"
          type="submit">Save</button>
    </form>
  }
}

class ValidationErrors extends React.Component {
  render() {
    let keys = Object.keys(this.props.errors);
    return <div className="ui error message">
      <div className="header">Validation Error</div>
      <ol className="ui list">
      {
        keys.map((key) => {
          return <li>
            <code>{key}</code>
            {
              this.props.errors[key].map((msg) => {
                return <span> {msg}</span>
              })
            }
          </li>
        })
      }
      </ol>
    </div>
  }
}


class SuccessMessage extends React.Component {
  render() {
    return <div className="ui green huge message">
      Yay! Your project has successfully been saved.
    </div>
  }
}

class Instructions extends React.Component {
  constructor() {
    super();
    this.state = {
      successMessage: false,
      instructionSecret: 'your secret',
      payloadUrl: 'https://headsupper.dev',  // XXX be starter about this
    };
  }

  onSave(secret) {
    this.setState({successMessage: true, instructionSecret: secret});
    setTimeout(() => {
      this.setState({successMessage: false});
    }, 5000);
    this.loadPastProjects();
  }

  render() {
    return (
      <div>
        { this.state.successMessage ? <SuccessMessage/> : null }

        <h2 className="ui dividing header">
          1. Prepare your first configuration
        </h2>

        <Form onSave={this.onSave.bind(this)}/>

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
              <li>On <b>Secret</b> type in <code>{this.state.instructionSecret}</code></li>
              <li>On <b>Which events would you like to trigger this webhook?</b>
                keep to on
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
    fetch('/api/projects', {credentials: 'same-origin'})
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

ReactDOM.render(<Homepage/>, document.getElementById('mount-point'));
