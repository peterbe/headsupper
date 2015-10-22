import React from 'react';
import ReactDOM from 'react-dom';
import 'whatwg-fetch';


let lazyLoadCSS = (() => {
  let loaded = [];
  return (url) => {
    if (loaded.indexOf(url) === -1) {
      loaded.push(url);
      requestAnimationFrame(() => {
        let l = document.createElement('link');
        l.rel = 'stylesheet';
        l.href = url;
        let h = document.getElementsByTagName('head')[0];
        h.parentNode.insertBefore(l, h);
      });
    }
  };
})();

const HANDWRITING_FONT_URL = '//fonts.googleapis.com/css?family=Handlee';


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
        this.props.onSave(json.project);
      }
    })
    .catch((ex) => {
      console.log('parsing failed', ex)
    });
  }

  previewGitHubProject(event) {
    let currentTarget = event.currentTarget;
    setTimeout(() => {
      if (!currentTarget.contains(document.activeElement)) {
          console.log('component officially blurred', currentTarget.value);
      }
    }, 0);
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
            tabIndex="1"
            placeholder="e.g. mozilla/socorro"
            onBlur={this.previewGitHubProject.bind(this)}
            type="text"/>
      </div>
      <div className={getFieldClassName('github_webhook_secret')}>
        <label>GitHub Webhook Secret</label>
        <input
            ref="github_webhook_secret"
            tabIndex="2"
            placeholder="pick a secret word or short sentence"
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

  toggleExpansion(project) {
    lazyLoadCSS(HANDWRITING_FONT_URL);  // can be called repeatedly
    let expanded = this.state.expanded;
    expanded[project.key] = !expanded[project.key];
    this.setState({expanded: expanded});
    this.props.onExpansion(project, expanded[project.key]);
  }

  deleteProject(project) {
    if (confirm("Are you sure you want to delete this project?")) {
      let expanded = this.state.expanded;
      delete expanded[project.key];
      this.setState({expanded: expanded});
      this.props.onDeleteProject(project);
    }
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
          onClick={this.toggleExpansion.bind(this, project)}>
          <i className={'icon ' + (this.state.expanded[project.key] ? 'compress' : 'expand')}></i>
          {this.state.expanded[project.key] ? 'show less' : 'show more'}
        </button>
        <button className="small ui labeled icon button"
            onClick={this.deleteProject.bind(this, project)}>
          <i className="trash icon"></i>
          delete
        </button>
      </td>
    </tr>;
    rows.push(row1);
    if (this.state.expanded[project.key]) {
      let row2 = <tr>
        <td colSpan="2">
          <ProjectDetailsTable
            project={project}/>
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


class ProjectInstructions extends React.Component {
  render() {
    let payloadUrl = document.location.protocol + '//' + document.location.hostname;
    let project = this.props.project;
    let url = 'https://github.com/' + project.github_full_name + '/settings/hooks/new';
    return (
      <div className="ui grid">
        <div className="eight wide column">
          <ol className="ui list instruction-steps">
            <li>
              <a href={url}>Go to the <code>{project.github_full_name}</code> <b>Add webhook</b> page</a>
            </li>
            <li>
              On <b>Payload URL</b> type in <code>{payloadUrl}</code>
            </li>
            <li>
              On <b>Content type</b> leave it set to <code>application/json</code>
            </li>
            <li>
              On <b>Secret</b> type in <code>{this.props.project.github_webhook_secret}</code>
            </li>
            <li>On <b>Which events would you like to trigger this webhook?</b> keep to on <code>Just the push event</code></li>
            <li>Leave the <b>Active</b> checkbox on</li>
            <li>Press the green <b>Add webhook</b> button</li>
            <li><b>Profit!</b> Start using the keyword (<code>{this.props.project.trigger_word}</code>) in your commit messages</li>
          </ol>
        </div>
        <div className="eight wide column overlay-instructions">
          <img src="images/webhookscreenshot-smaller.png" alt="Screenshot"/>
          <span className="overlay-instruction overlay-header">
            Screenshot sample
          </span>
          <span className="overlay-instruction overlay-url">
            {payloadUrl}
          </span>
          <span className="overlay-instruction overlay-secret">
            {this.props.project.github_webhook_secret}
          </span>
          <span className="overlay-instruction overlay-button-arrow">← press this when done</span>
        </div>
      </div>
      )
  }
}



class Instructions extends React.Component {
  constructor() {
    super();
    this.state = {
      successMessage: false,
      projects: [],
      project: null,
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

  onSave(project) {
    this.setState({successMessage: true, project: project});
    setTimeout(() => {
      this.setState({successMessage: false});
    }, 5000);
    this.loadPastProjects();
  }

  onDeleteProject(project) {
    fetch('/api/csrf', {credentials: 'same-origin'})
    .then(function(response) {
      return response.json();
    })
    .then((token) => {
      let data = {csrfmiddlewaretoken: token.csrf_token};
      return fetch('/api/projects/delete/' + project.key, {
        method: 'post',
        credentials: 'same-origin',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
      .then((response) => {
        return response.json()
      })
      .then((json) => {
        if (this.state.project !== null && this.state.project.key === project.key) {
          this.setState({project: null});
        }
        this.loadPastProjects();
      })
      .catch((ex) => {
        console.error('delete failed', ex)
      });
    })
    .catch((ex) => {
      alert(ex);
    });
  }

  onExpansion(project, expanded) {
    if (expanded) {
      this.setState({project: project});
    } else {
      this.setState({project: null});
    }
  }

  formOuter() {
    if (this.state.project !== null) {
      return null;  // don't render anything
    }
    return (
      <div>
        <h2 className="ui dividing header">
          1. { this.state.projects.length ? 'Prepare another configuration' : 'Prepare your first configuration' }
        </h2>
        <Form onSave={this.onSave.bind(this)}/>
      </div>
    )
  }

  render() {
    return (
      <div>
        { this.state.successMessage ? <SuccessMessage/> : null }

        { this.state.projects.length ? <ProjectsTable projects={this.state.projects} onExpansion={this.onExpansion.bind(this)} onDeleteProject={this.onDeleteProject.bind(this)}/> : null}

        { this.formOuter(this,this.state.project) }

        <h2 className="ui dividing header">
          {this.state.project ? 'Tell GitHub about it' : '2. Tell GitHub about it'}
        </h2>

        {this.state.project ? <ProjectInstructions project={this.state.project}/> : <i>Awaiting configuration</i>}

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
