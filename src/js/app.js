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
            <label>Case-<b>sensitive</b> trigger</label>
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

class ProjectDetailsTable extends React.Component {
  render() {
    let project = this.props.project;
    return <table className="ui compact table">
      <tbody>
        <tr>
          <th>Trigger Word</th>
          <td>{project.trigger_word}</td>
        </tr>
        <tr>
          <th>Case-<b>sensitive</b> trigger</th>
          <td>
            <i className={'large icon ' + (project.case_sensitive_trigger_word ? 'green checkmark' : 'red minus')}>
            </i>
          </td>
        </tr>
        <tr>
          <th>Send CC</th>
          <td>{project.send_cc ? project.send_cc : 'none'}</td>
        </tr>
        <tr>
          <th>Send BCC</th>
          <td>{project.send_bcc}</td>
        </tr>
        <tr>
          <th>CC the commit author always</th>
          <td>
            <i className={'large icon ' + (project.cc_commit_author ? 'green checkmark' : 'red minus')}>
            </i>
          </td>
        </tr>
        <tr>
          <th>Only send when a new tag is created</th>
          <td>
            <i className={'large icon ' + (project.on_tag_only ? 'green checkmark' : 'red minus')}>
            </i>
          </td>
        </tr>
      </tbody>
    </table>
  }
}


class ProjectsTable extends React.Component {
  constructor() {
    super();
    this.state = {
      expanded: {}
    };
  }

  toggleExpansion(key) {
    let expanded = this.state.expanded;
    expanded[key] = !expanded[key];
    this.setState({expanded: expanded});
  }

  trs(project) {
    let rows = [];
    let row1 = <tr>
      <td>
        <h3 className="single line">
          <a href={'https://github.com/' + project.github_full_name}>
            {project.github_full_name}
          </a>
        </h3>
      </td>
      <td className="single line">
        <code>{project.github_webhook_secret}</code>
      </td>
      <td>
        {project.send_to}
      </td>
      <td>
        <button
          className="small ui labeled icon button"
          onClick={this.toggleExpansion.bind(this, project.key)}>
          <i className={'icon ' + (this.state.expanded[project.key] ? 'compress' : 'expand')}></i>
          {this.state.expanded[project.key] ? 'show less' : 'show more'}
        </button>
      </td>
    </tr>;
    rows.push(row1);
    if (this.state.expanded[project.key]) {
      let row2 = <tr>
        <td colSpan="2">
          <ProjectDetailsTable project={project}/>
        </td>
      </tr>;
      rows.push(row2);
    }
    return rows;
  }

  render() {
    return <div>
      <h2 className="ui dividing header">Existing Configurations</h2>
      <table className="ui compact table">
        <thead>
          <tr>
            <th>GitHub Full Name</th>
            <th>GitHub Webhook Secret</th>
            <th>Send to</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {
            this.props.projects.map((project) => {
              return this.trs(project)
          })
        }
        </tbody>
      </table>
    </div>
  }
}

class Instructions extends React.Component {
  constructor() {
    super();
    this.state = {
      successMessage: false,
      projects: [],
      instructionSecret: 'your secret',
      payloadUrl: 'https://headsupper.dev',  // XXX be starter about this
    };

    this.loadPastProjects();
  }

  loadPastProjects() {
    fetch('/api/projects', {credentials: 'same-origin'})
    .then((response) => {
      return response.json();
    })
    .then((json) => {
      this.setState({projects: json.projects});
    })
    .catch((ex) => {
      alert(ex);
    });
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

        { this.state.projects.length ? <ProjectsTable projects={this.state.projects}/> : null}

        <h2 className="ui dividing header">
          1. { this.state.projects.length ? 'Prepare another configuration' : 'Prepare your first configuration' }
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
      projects: [],
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

ReactDOM.render(<Homepage/>, document.getElementById('mount-point'));
