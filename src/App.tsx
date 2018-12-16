import React, { useState, useCallback, useEffect, useMemo } from 'react';
import styled, { css, createGlobalStyle } from 'styled-components';
import { lighten, darken, readableColor as _readableColor } from 'polished';

type SiteOptions = {
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  navBackgroundColor: string;
  galleryBackgroundColor: string;
  featuredBackgroundColor: string;
};

type AppProps = {
  initialSiteOptions: SiteOptions;
};

type FormOk<State> = {
  state: State;
  status: 'ok';
};

type FormSavePending<State> = {
  state: State;
  status: 'pending';
};

type FormSaveRequested<State> = {
  state: State;
  status: 'requested';
};

type FormError<State> = {
  error: Error;
  state: State;
  status: 'error';
};

type Form<State> =
  | FormOk<State>
  | FormError<State>
  | FormSavePending<State>
  | FormSaveRequested<State>;

type FormOptions<State> = {
  initialState: State;
  saveForm: (newState: State, prevState: State) => Promise<void>;
};

type FieldUpdater<State, FieldName extends keyof State> = (
  name: FieldName,
  value: State[FieldName],
) => void;

type ColorOptionProps = {
  onChange: (value: string) => void;
  value: string;
  label: React.ReactNode;
};

const GlobalStyle = createGlobalStyle`
  body {
    font-family: Hevletica, Arial, sans-serif;
  }
`;

function readableColor(color: string, fallback: string) {
  try {
    return _readableColor(color);
  } catch (e) {
    return fallback;
  }
}

const PrimaryButton = styled.button`
  border: none;
  box-shadow: 0px 1px 5px 0px rgba(0, 0, 0, 0.5);
  color: #fff;
  background-color: #2196f3;
  cursor: pointer;
  font-size: 16px;
  padding: 15px 20px;
  transition: background-color 0.1s ease-out, color 0.1s ease-out,
    box-shadow 0.1s ease-out, transform 0.1s ease-out;
  outline: none;

  &:disabled {
    background-color: #9e9e9e;
    cursor: not-allowed;
  }

  &:not(:disabled) {
    &:hover,
    &:focus {
      background-color: ${lighten(0.05, '#2196f3')};
      box-shadow: 0px 3px 10px 0px rgba(0, 0, 0, 0.5);
      transform: scale(1.05);
    }
  }

  :active {
    background-color: ${darken(0.05, '#2196f3')};
    box-shadow: 0px 0px 4px 0px rgba(0, 0, 0, 0.5);
    transform: scale(1);
  }
`;

const ColorInput = styled.input`
  background: none;
  border: none;
  font-size: inherit;
  outline: none;
  padding-bottom: 5px;
  color: inherit;
  border-bottom: 2px solid;
`;

const Row = styled.div`
  margin: 0 auto;
  max-width: 960px;

  & + & {
    margin-top: 20px;
  }
`;

const ColorInputHashPrefix = styled.div`
  display: flex;
  align-items: baseline;

  ${ColorInput} {
    margin-left: -2ex;
    padding-left: 2ex;
  }

  ::before {
    content: '#';
    color: inherit;
    width: 2ex;
    font-size: inherit;
  }
`;

const ColorOptionLabel = styled.label<{ color: string }>(props => {
  const textColor = readableColor(props.color, '#000');
  return css`
    background: ${props.color};
    color: ${textColor};
    display: flex;
    flex-direction: column;
    font-size: 20px;
    box-shadow: 0px 1px 5px 0px rgba(0, 0, 0, 0.5);
    position: relative;
    padding: 10px;
    align-items: flex-start;

    &:before {
      content: ' ';
      width: 100%;
      padding-top: 100%;
      display: inline-flex;
    }
  `;
});

function useForm<FormState>(options: FormOptions<FormState>) {
  const { initialState, saveForm } = options;

  const [savedState, setSavedState] = useState(initialState);
  const [form, setForm] = useState<Form<FormState>>({
    state: initialState,
    status: 'ok',
  });

  const { state, status } = form;
  const hasChanged = useMemo(
    () =>
      Object.keys(state).some(
        // @ts-ignore
        optionName => savedState[optionName] !== state[optionName],
      ),
    [savedState, state],
  );

  useEffect(() => {
    if (status === 'requested') {
      setForm({ ...form, status: 'pending' });
      saveForm(state, savedState)
        .then(() => {
          setSavedState(state);
          setForm({ status: 'ok', state });
        })
        .catch(error => setForm({ status: 'error', error, state }));
    }
  }, [status, state, savedState, setForm, setSavedState]);

  const setField = useCallback<FieldUpdater<FormState, keyof FormState>>(
    (prop, value) =>
      setForm({
        ...form,
        state: {
          ...state,
          [prop]: value,
        },
      }),
    [form, setForm],
  );

  const handleSave = useCallback(
    () =>
      setForm({
        ...form,
        status: 'requested',
      }),
    [form, setForm],
  );

  return {
    state,
    status,
    setField,
    handleSave,
    hasChanged,
  };
}

async function saveOptions(options: SiteOptions) {
  try {
    await fetch(process.env.REACT_APP_SITE_SETTINGS_URL as string, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
  } catch (err) {
    console.log(err);
  }
}

function ColorOption(props: ColorOptionProps) {
  return (
    <ColorOptionLabel color={props.value}>
      <div style={{ fontSize: '12px', order: -1 }}>{props.label}</div>
      <ColorInputHashPrefix>
        <ColorInput
          type="text"
          maxLength={6}
          size={7}
          value={props.value.substring(1)}
          onChange={e => props.onChange(`#${e.target.value}`)}
        />
      </ColorInputHashPrefix>
    </ColorOptionLabel>
  );
}

function App(props: AppProps) {
  const { initialSiteOptions } = props;
  const [password, setPassword] = useState('');
  const saveForm = useCallback(
    state => {
      setPassword('');
      return saveOptions({
        ...state,
        password,
      });
    },
    [password, setPassword],
  );

  const { setField, state, status, handleSave, hasChanged } = useForm<
    SiteOptions
  >({
    initialState: initialSiteOptions,
    saveForm,
  });

  return (
    <div>
      <GlobalStyle />
      <Row>
        <h1>Site Settings</h1>
      </Row>
      <Row style={{ display: 'flex', justifyContent: 'space-between' }}>
        <ColorOption
          label="Primary Color"
          value={state.primaryColor}
          onChange={value => setField('primaryColor', value)}
        />
        <ColorOption
          label="Secondary Color"
          value={state.secondaryColor}
          onChange={value => setField('secondaryColor', value)}
        />
        <ColorOption
          label="Text Color"
          value={state.textColor}
          onChange={value => setField('textColor', value)}
        />
        <ColorOption
          label="Nav BG"
          value={state.navBackgroundColor}
          onChange={value => setField('navBackgroundColor', value)}
        />
        <ColorOption
          label="Gallery BG"
          value={state.galleryBackgroundColor}
          onChange={value => setField('galleryBackgroundColor', value)}
        />
        <ColorOption
          label="Featured BG"
          value={state.featuredBackgroundColor}
          onChange={value => setField('featuredBackgroundColor', value)}
        />
      </Row>
      <Row style={{ marginTop: '40px' }}>
        <label
          style={{
            display: 'inline-flex',
            fontSize: 'inherit',
            marginRight: '20px',
          }}
        >
          Password:
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </label>
        <PrimaryButton
          disabled={!password.length || status === 'pending'}
          onClick={handleSave}
        >
          {hasChanged
            ? 'Apply settings and rebuild site'
            : 'Refresh site content'}
        </PrimaryButton>
      </Row>
    </div>
  );
}

export default App;
