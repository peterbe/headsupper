import React from 'react';
import ReactDOM from 'react-dom';
import { Router, IndexRoute, Route, Link } from 'react-router';
import createBrowserHistory from 'history/lib/createBrowserHistory';
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


let projectFinder = (() => {
  let loaded = {};
  return (name) => {
    if (loaded[name] !== undefined) {
      let promise = new Promise((resolve) => {
        resolve(loaded[name])
      });
      return promise;
    } else {
      let url = '/api/preview-github-project?full_name=' + encodeURIComponent(name);
      return fetch(url, {credentials: 'same-origin'})
      .then((response) => {
        return response.json();
      })
      .then((json) => {
        loaded[name] = json.project;
        return json.project;
      })
      .catch((ex) => {
        console.error('Unable to fetch project', ex);
      });
    }
  }
})();

const HANDWRITING_FONT_URL = '//fonts.googleapis.com/css?family=Handlee&subset=latin';


class Form extends React.Component {

  constructor() {
    super();

    this.state = {
        advanced: false,
        loading: false,
        errors: null,
        previewProject: null,
    };
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
    if (!this.props.csrfmiddlewaretoken) {
      throw new Error("No CSRF token acquired");
    }
    var data = {};
    data.csrfmiddlewaretoken = this.props.csrfmiddlewaretoken;

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
      'on_tag_only',
      'on_branch',
    ];
    refs.forEach((key) => {
      let ref = this.refs[key];
      if (ref === undefined) {
        throw new Error('Invalid key: ' + key);
      }
      data[key] = getValue(ref);
    });
    this.setState({loading: true});
    this._postJSON('/api/projects/add', data)
    .then((response) => {
      this.setState({loading: false})
      return response.json()
    })
    .then((json) => {
      if (json._errors) {
        console.warn("VALIDATION ERRORS!", json._errors);
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
        if (this.state.previewProject) {
          this.setState({previewProject: null});
        }
        this.props.onSave(json.project);
      }
    })
    .catch((ex) => {
      alert("A server error happened. Sorry. Please try again.");
      console.error('parsing failed', ex);
    });
  }

  previewGitHubProject(event) {
    if (event.target.value) {
      projectFinder(event.target.value)
      .then((project) => {
        if (project !== undefined) {  // it'll be undefined on exceptions
          // this `project` might be null, and we distinguish that
          // from null by making it a {} which is truish.
          this.setState({previewProject: project || {}});
        }
      });
    }
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
        { this.state.previewProject ? <PreviewProject project={this.state.previewProject}/> : null }
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
      <div className={getFieldClassName('send_to')}>
        <label>Send To</label>
        <textarea
            rows="2"
            ref="send_to"
            tabIndex="3"
            placeholder="email addresses separated by ; or newline"
            ></textarea>
      </div>
      <div className={getFieldClassName('on_branch')}>
        <label>On Branch <small>(only trigger when pushed to this branch; leave empty )</small></label>
        <input
            ref="on_branch"
            tabIndex="4"
            defaultValue="master"
            type="text"/>
      </div>
      <div className={getFieldClassName('trigger_word')}>
        <label>Trigger Word</label>
        <input
            ref="trigger_word"
            tabIndex="5"
            defaultValue="Headsup"
            type="text"/>
      </div>
      <div className={getFieldClassName('case_sensitive_trigger_word')}>
        <div className="ui checkbox toggle">
          <input
              ref="case_sensitive_trigger_word"
              tabIndex="6"
              type="checkbox"
              />
            <label>Case-<b>sensitive</b> trigger</label>
        </div>
      </div>
      <div className={getFieldClassName('send_cc')}>
        <label>Send CC</label>
        <textarea
            rows="2"
            ref="send_cc"
            placeholder="email addresses separated by ; or newline"
            tabIndex="7"
            ></textarea>
      </div>
      <div className={getFieldClassName('send_bcc')}>
        <label>Send BCC</label>
        <textarea
            rows="2"
            ref="send_bcc"
            placeholder="email addresses separated by ; or newline"
            tabIndex="8"
            ></textarea>
      </div>
      <div className={getFieldClassName('on_tag_only')}>
        <div className="ui checkbox toggle">
          <input
              ref="on_tag_only"
              tabIndex="9"
              type="checkbox"/>
            <label>Only send when a new tag is created</label>
        </div>
      </div>
      { this.state.errors ? <ValidationErrors errors={this.state.errors} /> : null }
      <button
          tabIndex="10"
          className="ui primary button"
          type="submit">Save Configuration</button>
    </form>
  }
}


class PreviewProject extends React.Component {
  render() {
    if (this.props.project.name) {
      // found it!
      return (
        <div className="ui pointing below label">
          <b>Found it!</b> <a href={this.props.project.html_url}>{this.props.project.description || this.props.project.description}</a>
        </div>
      )
    } else {
      return (
        <div className="ui pointing below red basic label">
          <b>Could not be found :(</b> Sorry, if it does exist but is private. Only public projects possible.
        </div>
      )
    }
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
          return <li key={key}>
            <code>{key}</code>
            {
              this.props.errors[key].map((msg) => {
                return <span key={key+msg}> {msg}</span>
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
      Yay! Your project has been saved successfully.
    </div>
  }
}

class ProjectDetailsTable extends React.Component {
  render() {
    let project = this.props.project;
    return <table className="ui compact table">
      <tbody>
        <tr>
          <th>GitHub Webhook Secret</th>
          <td><code>{project.github_webhook_secret}</code></td>
        </tr>
        <tr>
          <th>On Branch</th>
          <td><code>{project.on_branch}</code></td>
        </tr>
        <tr>
          <th>Trigger Word</th>
          <td><code>{project.trigger_word}</code></td>
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
    expanded[project.id] = !expanded[project.id];
    this.setState({expanded: expanded});
    this.props.onExpansion(project, expanded[project.id]);
  }

  deleteProject(project) {
    if (confirm("Are you sure you want to delete this project?")) {
      let expanded = this.state.expanded;
      delete expanded[project.id];
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
        <span title="Total times used">{project.payloads.times_used}</span> &nbsp;
        (<span title="Number of times it has found something to email about">{project.payloads.times_messages_sent}</span>)
      </td>
      <td>
        {project.send_to}
      </td>
      <td>
        <button
          className="tiny ui labeled icon button"
          onClick={this.toggleExpansion.bind(this, project)}>
          <i className={'icon ' + (this.state.expanded[project.id] ? 'compress' : 'expand')}></i>
          {this.state.expanded[project.id] ? 'show less' : 'show more'}
        </button>
        <button className="tiny ui labeled icon button"
            onClick={this.deleteProject.bind(this, project)}>
          <i className="trash icon"></i>
          delete
        </button>
      </td>
    </tr>;
    rows.push(row1);
    if (this.state.expanded[project.id]) {
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
            <th>Times Used</th>
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
      <div className="ui grid stackable grid">
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


class SpamboxPrevention extends React.Component {
  render() {
    return (
      <div className="ui raised segment">
        <p><b>Note!</b> When you've set this up, expect to receive emails
        sent from <code>io@headsupper.io</code>.<br/>
        Watch out so it doesn't accidentally go to your <b>Spam folder</b>!</p>
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
      csrfmiddlewaretoken: null,
    };
    this.loadPastProjects()
    .then(() => {
      // get one of these in case we need to d a post
      this.loadCsrfMiddlewareToken();
    })
  }

  loadPastProjects() {
    return fetch('/api/projects', {credentials: 'same-origin'})
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

  loadCsrfMiddlewareToken() {
    return fetch('/api/csrf', {credentials: 'same-origin'})
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

  onSave(project) {
    lazyLoadCSS(HANDWRITING_FONT_URL);  // can be called repeatedly
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
      return fetch('/api/projects/delete/' + project.id, {
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
        if (this.state.project !== null && this.state.project.id === project.id) {
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
        <Form onSave={this.onSave.bind(this)} csrfmiddlewaretoken={this.state.csrfmiddlewaretoken}/>
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

        {this.state.project ? <SpamboxPrevention project={this.state.project}/> : null}

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
      alert('Internal Server error on the backend. Sorry. Please try again.');
      console.error(ex);
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
        <div className="ui center aligned header">
          <h2 className="ui header">You have to sign in</h2>
          <p>
            <a href="/accounts/github/login/" className="ui github button huge">
              <i className="github icon"></i>
              Sign in with GitHub
            </a>
          </p>

          <h2 className="ui header">Not sure what this is?</h2>
            <p>
              <Link to="/about" className="ui button">Read the About page</Link>
            </p>
        </div>
      )
    }
  }
}

class App extends React.Component {
  // should I move the signedin stuff to here?!
  render() {
    return (
      <div className="ui container">
        <div >

          <h1 id="title">Headsupper</h1>

          {this.props.children}

        </div>
        <div className="ui vertical footer segment">
          <div className="ui center aligned container">
            <div className="ui horizontal small divided link list">
              <Link to="/" className="item">Home</Link>
              <Link to="/about" className="item">About</Link>
              <a className="item" href="http://www.peterbe.com">By @peterbe</a>
              <a className="item" href="https://github.com/peterbe/headsupper">On GitHub</a>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

class About extends React.Component {
  render() {
    let payloadUrl = document.location.protocol + '//' + document.location.hostname;
    return (
      <div className="ui text container">
        <h2 className="ui dividing header">About Headsupper.io</h2>
        <h5>tl;dr</h5>
        <h3>1. You configure your Headsupper.io project</h3>
        <h3>2. You make a <i>git commit</i> meantioning <code>headsup: …some message…</code></h3>
        <h3>3. Push to <i>GitHub</i> and an email it sent with that message you committed</h3>
        <hr style={{margin: '60px'}}/>

        <h3 className="ui dividing header">The Basics</h3>
        <p>
        It works by you setting up a <b>GitHub Webhook</b> that sends a HTTPS POST to <code>{payloadUrl}</code> which then parses the commit message and looks for the <code>headsup</code> keyword. &nbsp;
        <b>If</b> it's there an email goes out mentioning this.
        </p>
        <p>
          <b>For example</b>, a git commit message can look like this:
        </p>
        <pre>upgrading to Django 1.9, fixes #123 headsup: remember to pip upgrade</pre>
          <p>
            Or on multiple lines like this:
          </p>
        <pre>TPS report, fixes #124
<br/><br/>
Headsup: To test the new report go to your cube and press the Inbox button</pre>

        <h3 className="ui dividing header">Who To Send To</h3>
        <p>You can send to a list of email addresses. Not just one email address.</p>
        <p>Perhaps you have a team or a mailing list you can use to reach everyone
          who might be interested.
        </p>
        <p>
          You can also have it send to a certain email address(es) <b>and</b> additionally
          you send a CC to another email address(es). You can set up an address(es)
          to BCC to too.
        </p>

        <h3 className="ui dividing header">When To Send</h3>
        <p>
          Optionally you can set it up so that an email only goes out when you
          make a new <b>git tag</b> and push that to <b>GitHub</b>. For example,
          you might have an address(es) that only care when a new tagged releas
          is made.
        </p>

        <p>For example, you can have one configuration that alerts the team on
        all commits (that have a <code>headsup:</code> keyword) and you
         have <i>another</i> configuration that goes to the project management team
         on all tags pushed.
      </p>

        <h3 className="ui dividing header">What it Looks Like</h3>

        <a href="images/in-inbox.png"><img src="images/in-inbox-smaller.png" alt="Email"/></a>

        <p>You don't have to make all your commits from GitHub Pull Requests, but this,
          above, screenshot came from a Pull Request that looked like this:
        </p>

        <a href="images/pull-request.png"><img src="images/pull-request-smaller.png" alt="Pull Request"/></a>

        <hr style={{margin: '60px'}}/>

        <Link to="/" className="fluid ui button positive">Configure a project now</Link>

      </div>
    )

  }
}


ReactDOM.render((
  <Router history={createBrowserHistory()}>
    <Route path="/" component={App}>
      <IndexRoute component={Homepage} />
      <Route path="about" component={About} />
    </Route>
  </Router>
), document.getElementById('mount-point'))
